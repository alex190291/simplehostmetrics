# simplehostmetrics
A Simple Dashboard written in Flask and Javascript that shows CPU, RAM and Disk usage as well as running Docker Containers.
It does not provide any form of authentication so make sure it is deployed in a safe way behind a firewall, oauth2 proxy or at least a reverse proxy with http basic authentication.

## Usage
First install the dependencies with:

```pip install flask psutils docker python-datetime```

Then just run the app with:

```python app.py```

The app will listen on Port 5000 (can be changed in the last line of app.py)

## Docker
I made a lightweight Docker Image based on Alpine Linux. To run it symply run:

```docker run --name simplemetrics --hostname simplemetrics --net [your docker network name] ```
```-p 5000:5000 -v /proc:/proc -v /var/run/docker.sock:ro attax/simplemetrics:latest```
