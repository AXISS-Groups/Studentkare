import asyncio
import aiohttp
import time

async def fetch(session, url, request_id):
    try:
        start_time = time.time()
        async with session.get(url) as response:
            status = response.status
            await response.text()  # Read response body
            latency = time.time() - start_time
            return {"id": request_id, "status": status, "latency": latency, "error": None}
    except Exception as e:
        return {"id": request_id, "status": None, "latency": None, "error": str(e)}

async def main():
    # Target endpoint: backend healthcheck (which hits the DB). 
    # Adjust URL if your backend binds to a different port locally.
    url = "http://localhost:8000/api/health"
    num_requests = 550  # Over the 500 requirement
    
    print(f"Starting load test against {url} with {num_requests} concurrent requests...")
    
    start_time = time.time()
    
    # Increase client-side connection limits so aiohttp doesn't bottleneck us
    connector = aiohttp.TCPConnector(limit=num_requests + 50)
    async with aiohttp.ClientSession(connector=connector) as session:
        tasks = [fetch(session, url, i) for i in range(num_requests)]
        results = await asyncio.gather(*tasks)
    
    total_time = time.time() - start_time
    
    successful = [r for r in results if r["status"] == 200]
    failed = [r for r in results if r["status"] != 200]
    
    print(f"\n--- Load Test Results ---")
    print(f"Total Time: {total_time:.2f}s")
    print(f"Total Requests: {num_requests}")
    print(f"Successful (200 OK): {len(successful)}")
    print(f"Failed/Dropped: {len(failed)}")
    
    if failed:
        print("\nErrors encountered:")
        errors = set(r["error"] for r in failed if r["error"])
        status_codes = set(r["status"] for r in failed if r["status"])
        if errors:
            print(f"  Exceptions: {errors}")
        if status_codes:
            print(f"  Status Codes: {status_codes}")
    else:
        print("\nSUCCESS! PgBouncer handled the concurrent load flawlessly with zero dropped connections.")

if __name__ == "__main__":
    asyncio.run(main())
