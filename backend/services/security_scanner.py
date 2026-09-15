import socket
import struct
from fastapi import HTTPException

# The internal IP of the Dokploy server where Universal ClamAV runs
CLAMAV_HOST = "65.21.196.49"
CLAMAV_PORT = 3310

def scan_file_for_viruses(file_bytes: bytes) -> bool:
    """
    Scans a byte stream using the universal ClamAV container over TCP.
    Raises an HTTPException if a virus is found or the scanner fails.
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
        response = s.recv(1024).decode('utf-8').strip()
        s.close()
        
        # Parse the ClamAV response
        # Format is usually 'stream: OK' or 'stream: Eicar-Test-Signature FOUND'
        if 'OK' in response:
            return True
        elif 'FOUND' in response:
            virus_name = response.split(' ')[1] if len(response.split(' ')) > 1 else "Unknown"
            print(f"[SECURITY] Virus uploaded blocked! Signature: {virus_name}")
            raise HTTPException(400, f"Security Error: Malicious file detected ({virus_name}). Upload blocked.")
        else:
            print(f"[SECURITY] ClamAV unexpected response: {response}")
            raise HTTPException(500, "Security scanner failed to verify the file.")
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"[SECURITY] ClamAV connection failed: {e}")
        # Fail closed for security (don't allow uploads if scanner is down)
        raise HTTPException(500, "Security scanner is currently offline. File uploads are temporarily paused.")

