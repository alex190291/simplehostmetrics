import logging
import time
import requests
import datetime
from database import get_db_connection
from sqlite3 import Row

# IP-API-Free: etwa ~45 Requests pro Minute
IP_API_URL = "http://ip-api.com/json/"  # + IP

# Wie alt Einträge sein dürfen (Sekunden), z.B. 7 Tage
CACHE_EXPIRY = 7 * 24 * 3600

# Für die animierte Linie zum "Server-Standort" (Demo: Koordinaten in DE)
SERVER_LAT = 51.3
SERVER_LON = 9.5

def get_security_summary():
    """
    Liest Sicherheits-Infos aus (z.B. Anzahl geblockter IPs,
    fehlgeschlagene Logins) aus 'security_log'.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    # Anzahl aller Events
    cursor.execute("SELECT COUNT(*) AS total_events FROM security_log")
    total_events_row = cursor.fetchone()
    total_events = total_events_row['total_events'] if total_events_row else 0

    # Anzahl blockierter IPs (fail2ban) -> "blocked"
    cursor.execute("SELECT COUNT(DISTINCT ip) AS blocked_count FROM security_log WHERE action = 'blocked'")
    blocked_row = cursor.fetchone()
    blocked_count = blocked_row['blocked_count'] if blocked_row else 0

    # Anzahl fehlgeschlagener Logins
    cursor.execute("SELECT COUNT(*) AS failed_logins FROM security_log WHERE action = 'failed_login'")
    failed_row = cursor.fetchone()
    failed_count = failed_row['failed_logins'] if failed_row else 0

    conn.close()
    return {
        "total_events": total_events,
        "blocked_ips": blocked_count,
        "failed_logins": failed_count
    }

def get_attack_events(limit=50):
    """
    Liest die neuesten Security-Events (IPs, Ports/Services) aus 'security_log',
    ergänzt Geodaten aus ip_cache (oder fragt ip-api.com).
    Gibt Liste von Dicts: ip, port, lat, lon, country, city, ...
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    # Calculate the timestamp for 24 hours ago
    twenty_four_hours_ago = int(time.time()) - 86400  # 24 hours in seconds

    cursor.execute("""
        SELECT
            ip, port, action, timestamp
        FROM
            security_log
        WHERE
            timestamp > ?
        ORDER BY
            timestamp DESC
        LIMIT ?
    """, (twenty_four_hours_ago, limit))
    rows = cursor.fetchall()
    conn.close()

    events = []
    for row in rows:
        ip = row['ip']
        geo = get_ip_geo_cached(ip)
        port = row['port']

        evt = {
            "ip": ip,
            "port": port,
            "action": row['action'],
            "timestamp": row['timestamp'],
            "latitude": geo.get("lat"),
            "longitude": geo.get("lon"),
            "country": geo.get("country", ""),
            "city": geo.get("city", ""),
            "server_lat": SERVER_LAT,
            "server_lon": SERVER_LON
        }
        events.append(evt)

    return events

def get_ip_geo_cached(ip):
    """
    Fragt zuerst ip_cache. Bei Fehl-/Alttreffer: ip-api.com.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    now_ts = int(time.time())
    cursor.execute("SELECT * FROM ip_cache WHERE ip = ?", (ip,))
    row = cursor.fetchone()

    if row:
        # Check, ob zu alt
        last_update = row['last_update']
        if (now_ts - last_update) < CACHE_EXPIRY:
            conn.close()
            return {
                "lat": row['latitude'],
                "lon": row['longitude'],
                "country": row['country'],
                "city": row['city']
            }
        else:
            geo = lookup_ip_api(ip)
            if geo:
                cursor.execute("""
                    UPDATE ip_cache
                    SET latitude=?, longitude=?, country=?, city=?, last_update=?
                    WHERE ip=?
                """, (geo["lat"], geo["lon"], geo["country"], geo["city"], now_ts, ip))
                conn.commit()
                conn.close()
                return geo
            else:
                conn.close()
                return {
                    "lat": row['latitude'],
                    "lon": row['longitude'],
                    "country": row['country'],
                    "city": row['city']
                }
    else:
        geo = lookup_ip_api(ip)
        if geo:
            try:
                cursor.execute("""
                    INSERT INTO ip_cache (ip, latitude, longitude, country, city, last_update)
                    VALUES (?, ?, ?, ?, ?, ?)
                """, (ip, geo["lat"], geo["lon"], geo["country"], geo["city"], now_ts))
                conn.commit()
            except Exception as e:
                logging.error("Error inserting into ip_cache: %s", e)
        conn.close()
        return geo if geo else {"lat": None, "lon": None, "country": "", "city": ""}

def lookup_ip_api(ip):
    """
    Ruft ip-api.com auf und gibt Dict mit lat,lon,country,city zurück.
    """
    try:
        resp = requests.get(IP_API_URL + ip, timeout=5)
        data = resp.json()
        if data.get("status") == "success":
            return {
                "lat": data.get("lat"),
                "lon": data.get("lon"),
                "country": data.get("country"),
                "city": data.get("city")
            }
    except Exception as e:
        logging.error("lookup_ip_api error for IP %s: %s", ip, e)
    return None
