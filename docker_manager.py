import docker
import time
import threading
import logging
from datetime import datetime

client = docker.from_env()
updating_containers = {}
image_update_info = {}
update_status = {}
check_all_status = {'in_progress': False, 'checked': 0, 'total': 0}

# Diese Variable speichert die zuletzt ermittelte Docker-Information.
docker_data_cache = []

def parse_docker_created(created_str):
    if created_str.endswith('Z'):
        created_str = created_str[:-1]
    if '.' in created_str:
        base, frac = created_str.split('.', 1)
        frac = frac[:6]
        created_str = base + '.' + frac
        fmt = '%Y-%m-%dT%H:%M:%S.%f'
    else:
        fmt = '%Y-%m-%dT%H:%M:%S'
    try:
        return datetime.strptime(created_str, fmt)
    except Exception:
        return datetime.now()

def get_docker_info():
    containers = []
    real_containers = {c.name: c for c in client.containers.list(all=True)}
    for cname, container in real_containers.items():
        try:
            created = container.attrs.get('Created', '')
            dt_created = parse_docker_created(created) if created else datetime.now()
            uptime = int(time.time() - dt_created.timestamp())
        except Exception:
            uptime = 0
        if container.image.tags:
            display_image = container.image.tags[0]
            used_image = display_image
            is_up_to_date = image_update_info.get(cname, True)
        elif "RepoDigests" in container.image.attrs and container.image.attrs["RepoDigests"]:
            repo_digest = container.image.attrs["RepoDigests"][0]
            repo_name = repo_digest.split("@")[0]
            used_image = repo_name + ":latest"
            display_image = repo_name
            is_up_to_date = image_update_info.get(cname, True)
        else:
            display_image = "untagged"
            used_image = "untagged"
            is_up_to_date = False
        status_str = container.status
        if cname in updating_containers:
            ud = updating_containers[cname]
            if ud["in_progress"]:
                status_str = f"Updating ({ud.get('phase','')})"
            elif ud["error"]:
                status_str = f"Update failed: {ud['error']}"
            elif ud["success"]:
                status_str = "Update success"
        containers.append({
            'name': cname,
            'status': status_str,
            'image': display_image,
            'used_image': used_image,
            'created': container.attrs.get('Created', ''),
            'uptime': uptime,
            'up_to_date': is_up_to_date
        })
    for cname, ud in updating_containers.items():
        if cname not in real_containers:
            phase_str = ud.get("phase", "Updating")
            status_str = f"Updating ({phase_str})"
            if ud["error"]:
                status_str = f"Update failed: {ud['error']}"
            elif ud["success"]:
                status_str = "Update success"
            containers.append({
                'name': cname,
                'status': status_str,
                'image': "(updating...)",
                'used_image': "(updating...)",
                'created': "",
                'uptime': 0,
                'up_to_date': False
            })
    return containers

def docker_info_updater():
    UPDATE_INTERVAL = 5  # Sekunden
    while True:
        try:
            docker_data = get_docker_info()
            global docker_data_cache
            docker_data_cache = docker_data
        except Exception as e:
            logging.error("Error in docker_info_updater: %s", e)
        time.sleep(UPDATE_INTERVAL)

def check_image_updates():
    while True:
        try:
            for container in client.containers.list(all=True):
                if container.image.tags:
                    image_tag = container.image.tags[0]
                else:
                    repo_digest = container.image.attrs.get("RepoDigests", [])
                    if repo_digest:
                        repo_name = repo_digest[0].split("@")[0]
                        image_tag = repo_name + ":latest"
                    else:
                        continue
                try:
                    latest_img = client.images.pull(image_tag)
                except Exception as e:
                    logging.error("Error pulling %s: %s", image_tag, e)
                    continue
                image_update_info[container.name] = (container.image.id == latest_img.id)
        except Exception as e:
            logging.error("Error checking image updates: %s", e)
        time.sleep(60)

def update_container(container_name):
    global updating_containers, image_update_info, update_status
    if container_name in updating_containers:
        del updating_containers[container_name]
    if container_name in update_status:
        del update_status[container_name]
    updating_containers[container_name] = {
        "phase": "pulling new image...",
        "new_image_id": None,
        "in_progress": True,
        "error": None,
        "success": False
    }
    update_status[container_name] = {
        "in_progress": True,
        "success": False,
        "error": None,
        "phase": "pulling new image..."
    }
    def do_update(cname):
        try:
            try:
                old_container = client.containers.get(cname)
            except docker.errors.NotFound:
                old_container = None

            time.sleep(2)
            updating_containers[cname]["phase"] = "pulling new image..."
            update_status[cname]["phase"] = "pulling new image..."

            if old_container and old_container.image.tags:
                image_tag = old_container.image.tags[0]
            else:
                if old_container and old_container.image.attrs.get("RepoDigests"):
                    repo_digest = old_container.image.attrs["RepoDigests"][0]
                    repo_name = repo_digest.split("@")[0]
                    image_tag = repo_name + ":latest"
                else:
                    msg = "No valid image tag/digest found"
                    updating_containers[cname]["error"] = msg
                    updating_containers[cname]["in_progress"] = False
                    update_status[cname]["error"] = msg
                    update_status[cname]["in_progress"] = False
                    return
            fresh_img = None
            try:
                fresh_img = client.images.pull(image_tag)
            except Exception as e:
                msg = f"Error pulling {image_tag}: {str(e)}"
                logging.error(msg)
                updating_containers[cname]["error"] = msg
                updating_containers[cname]["in_progress"] = False
                update_status[cname]["error"] = msg
                update_status[cname]["in_progress"] = False
                return
            if fresh_img:
                updating_containers[cname]["new_image_id"] = fresh_img.id

            updating_containers[cname]["phase"] = "stopping..."
            update_status[cname]["phase"] = "stopping..."
            time.sleep(2)
            if old_container:
                try:
                    old_container.stop(timeout=10)
                except Exception as e:
                    logging.error(f"Error stopping container {cname}: {e}")

            updating_containers[cname]["phase"] = "removing old container..."
            update_status[cname]["phase"] = "removing old container..."
            time.sleep(2)
            if old_container:
                try:
                    old_container.remove()
                except Exception as e:
                    logging.error(f"Error removing container {cname}: {e}")
                if image_tag:
                    try:
                        client.images.remove(image=image_tag, force=True)
                    except Exception as e:
                        logging.error(f"Error removing old image {image_tag}: {e}")

            updating_containers[cname]["phase"] = "starting..."
            update_status[cname]["phase"] = "starting..."
            time.sleep(2)
            config = old_container.attrs.get('Config', {}) if old_container else {}
            host_config = old_container.attrs.get('HostConfig', {}) if old_container else {}
            cmd = config.get('Cmd')
            env = config.get('Env')
            ports = host_config.get('PortBindings')
            volumes_config = config.get('Volumes', {})
            volumes = list(volumes_config.keys()) if volumes_config else None
            if volumes:
                volumes = [v for v in volumes if v not in ['/var/run/docker.sock', '/run/docker.sock']]
                if len(volumes) == 0:
                    volumes = None

            new_container = client.containers.run(
                image=image_tag,
                name=cname,
                command=cmd,
                environment=env,
                ports=ports,
                volumes=volumes,
                detach=True
            )

            waited = 0
            interval = 5
            max_wait = 300
            while waited < max_wait:
                new_container.reload()
                health_status = new_container.attrs.get("State", {}).get("Health", {}).get("Status")
                if health_status == "healthy" or (health_status is None and new_container.status.lower() == "running"):
                    updating_containers[cname]["success"] = True
                    update_status[cname]["success"] = True
                    break
                time.sleep(interval)
                waited += interval

            if not updating_containers[cname]["success"]:
                err_msg = "Container did not become healthy within 5 minutes."
                logging.error(err_msg)
                updating_containers[cname]["error"] = err_msg
                update_status[cname]["error"] = err_msg

        except Exception as e:
            logging.error(f"Error updating container '{cname}': {e}")
            updating_containers[cname]["error"] = str(e)
            update_status[cname]["error"] = str(e)
        finally:
            updating_containers[cname]["in_progress"] = False
            update_status[cname]["in_progress"] = False
            if updating_containers[cname]["success"]:
                try:
                    new_c = client.containers.get(cname)
                    new_image_id = updating_containers[cname].get("new_image_id")
                    if new_c and new_image_id and (new_c.image.id == new_image_id):
                        image_update_info[cname] = True
                except Exception:
                    pass
    threading.Thread(target=do_update, args=(container_name,), daemon=True).start()
    return {"status": "in_progress"}

def get_update_status(container_name):
    st = update_status.get(container_name)
    if not st:
        return {"in_progress": False, "success": False, "error": None, "phase": ""}
    return st

def check_container(container_name):
    def do_check(cname):
        try:
            cont = client.containers.get(cname)
        except Exception as e:
            logging.error(f"Container not found: {e}")
            return
        if cont.image.tags:
            image_tag = cont.image.tags[0]
        else:
            repo_digest = cont.image.attrs.get("RepoDigests", [])
            if repo_digest:
                repo_name = repo_digest[0].split("@")[0]
                image_tag = repo_name + ":latest"
            else:
                logging.error(f"Container '{cname}' has no image tag/digest")
                return
        try:
            latest_img = client.images.pull(image_tag)
            up_to_date = (cont.image.id == latest_img.id)
            image_update_info[cname] = up_to_date
        except Exception as e:
            logging.error(f"Error pulling image {image_tag} for {cname}: {e}")
    threading.Thread(target=do_check, args=(container_name,), daemon=True).start()
    return {"status": "success"}

def background_check_all():
    global check_all_status, image_update_info
    containers = client.containers.list(all=True)
    total = len(containers)
    check_all_status['in_progress'] = True
    check_all_status['checked'] = 0
    check_all_status['total'] = total
    for c in containers:
        cname = c.name
        tag = None
        if c.image.tags:
            tag = c.image.tags[0]
        else:
            repo_digest = c.image.attrs.get("RepoDigests", [])
            if repo_digest:
                repo_name = repo_digest[0].split("@")[0]
                tag = repo_name + ":latest"
        if tag:
            try:
                latest = client.images.pull(tag)
                image_update_info[cname] = (c.image.id == latest.id)
            except Exception as e:
                logging.error(f"Error pulling {tag} for {cname}: {e}")
        check_all_status['checked'] += 1
        time.sleep(0.3)
    check_all_status['in_progress'] = False

def check_all():
    if check_all_status['in_progress']:
        return {'status': 'already_in_progress'}
    t = threading.Thread(target=background_check_all, daemon=True)
    t.start()
    return {'status': 'started'}

def get_all_status():
    return {
        'in_progress': check_all_status['in_progress'],
        'checked': check_all_status['checked'],
        'total': check_all_status['total']
    }
