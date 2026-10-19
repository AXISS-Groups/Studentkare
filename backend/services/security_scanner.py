import os
import socket
import struct

from fastapi import HTTPException

from core.app_env import is_dev_or_test

# Dokploy global service hostname for Universal ClamAV (resolves on the internal Docker network).
# Override via CLAMAV_HOST env var if your deployment uses a different container/service name.
CLAMAV_HOST = os.getenv("CLAMAV_HOST", "globalservices-universalclamav-v9rmvc")
CLAMAV_PORT = int(os.getenv("CLAMAV_PORT", "3310"))

def scan_file_for_viruses(file_bytes: bytes, *, allow_offline_bypass: bool = True) -> bool:
    """
    Scans a byte stream using the universal ClamAV container over TCP.
    Raises an HTTPException if a virus is found or the scanner fails.

    ``allow_offline_bypass=False`` refuses the file whenever the scanner cannot be
    reached, in every environment, including development and test.
    """
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(5)
        s.connect((CLAMAV_HOST, CLAMAV_PORT))

        # Start INSTREAM
        s.sendall(b'zINSTREAM\0')

        # Send chunks
        chunk_size = 2048
        for i in range(0, len(file_bytes), chunk_size):
            chunk = file_bytes[i:i+chunk_size]
            # Send size as 4-byte big-endian integer, then the chunk
            s.sendall(struct.pack('!I', len(chunk)))
            s.sendall(chunk)

        # Send size 0 to end the stream
        s.sendall(struct.pack('!I', 0))

        # Read the response
        # zINSTREAM replies end in a NUL byte.
        response = s.recv(1024).decode('utf-8').strip().strip('\0').strip()
        s.close()

        # Parse the ClamAV response
        # Format is usually 'stream: OK' or 'stream: Eicar-Test-Signature FOUND'
        # FOUND first: a signature name can itself contain "OK".
        if response.endswith('FOUND'):
            virus_name = response.split(' ')[1] if len(response.split(' ')) > 1 else "Unknown"
            print(f"[SECURITY] Virus uploaded blocked! Signature: {virus_name}")
            raise HTTPException(400, f"Security Error: Malicious file detected ({virus_name}). Upload blocked.")
        elif response.endswith('OK'):
            return True
        else:
            print(f"[SECURITY] ClamAV unexpected response: {response}")
            raise HTTPException(500, "Security scanner failed to verify the file.")

    except HTTPException:
        raise
    except Exception as e:
        print(f"[SECURITY] ClamAV connection failed: {e}")
        # Only an explicit development/test environment may skip the scan. Unset
        # APP_ENV used to default to "development" here, so a deploy that forgot
        # APP_ENV accepted unscanned uploads.
        if allow_offline_bypass and is_dev_or_test() and not os.getenv("CLAMAV_STRICT"):
            print("[SECURITY] ClamAV scanner offline; bypassing check in non-production environment.")
            return True
        # Fail closed for security in production (don't allow uploads if scanner is down)
        raise HTTPException(500, "Security scanner is currently offline. File uploads are temporarily paused.")

