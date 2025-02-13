# simplehostmetrics
WARNING: This is a heavily in development Alpha... Updates can break the sqlite database... Absolutely NOT production ready... Don't bother to report bugs, I am aware of most of them anyways. 

A Simple Dashboard written in Flask and Javascript that shows CPU, RAM and Disk usage as well as running Docker Containers.
It does not provide any form of authentication so make sure it is deployed in a safe way behind a firewall, oauth2 proxy or at least a reverse proxy with http basic authentication.

If you want to help with this Project, contact me via mail. simplehostmetrics@nosinu-records.com

## Usage
First install the dependencies with:

```pip install flask psutils docker python-datetime```

Then just run the app with:

```python app.py```

The app will listen on Port 5000 (can be changed in the last line of app.py)

## Docker
I made a lightweight Docker Image based on Alpine Linux. To run it symply run:

```
docker run -d --name simplemetrics --hostname simplemetrics --net host -v /proc:/proc -v /var/run/docker.sock:/var/run/docker.sock attax/simplemetrics:latest /init.sh
```
## Pictures
![grafik](https://github.com/user-attachments/assets/6c9ed8d7-0f61-4480-97ed-c944fba68d98)


