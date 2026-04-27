import requests
import os
import json

ORS_API_KEY="eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6ImQwZDdhYTNjODU2YzRlMjlhNDNlMDliNzA1OTUxOWM3IiwiaCI6Im11cm11cjY0In0="

start_coords = (44.9778, -93.2650) # lat, lon
end_coords = (44.8833, -93.2120)

url = "https://api.openrouteservice.org/v2/directions/driving-car"
headers = {
    'Authorization': ORS_API_KEY,
    'Content-Type': 'application/json'
}

# Try GET method
params = {
    'start': f"{start_coords[1]},{start_coords[0]}",  # lon,lat format
    'end': f"{end_coords[1]},{end_coords[0]}",
    'geometry': 'true',
    'instructions': 'false',
    'summary': 'true'
}
response = requests.get(url, headers=headers, params=params)
print("GET Status:", response.status_code)
print("GET Response:", response.text[:200])

# Try GET method without Authorization header but with api_key param
params2 = params.copy()
params2['api_key'] = ORS_API_KEY
response2 = requests.get(url, params=params2)
print("GET with api_key Status:", response2.status_code)
print("GET with api_key Response:", response2.text[:200])

# Try POST method
url_post = "https://api.openrouteservice.org/v2/directions/driving-car/geojson"
body = {
    "coordinates": [
        [start_coords[1], start_coords[0]],
        [end_coords[1], end_coords[0]]
    ],
    "instructions": False,
    "geometry": True
}
response3 = requests.post(url_post, headers=headers, json=body)
print("POST Status:", response3.status_code)
print("POST Response:", response3.text[:200])
