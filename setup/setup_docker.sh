#!/bin/bash
#!/bin/bash
set -e

# This script detects the OS and version, removes Podman and related packages if installed,
# adds the necessary Docker repository, installs Docker CE (Community Edition),
# and starts plus enables the Docker service.

# Load OS details
if [ -f /etc/os-release ]; then
    . /etc/os-release
else
    echo "Cannot determine OS type. Exiting."
    exit 1
fi

echo "Detected OS: $NAME ($ID) Version: $VERSION_ID"

# Function to remove Podman and related packages
remove_podman() {
    echo "Checking for Podman..."
    if command -v podman >/dev/null 2>&1; then
        echo "Podman is installed. Removing Podman and related packages..."
        case "$ID" in
            ubuntu|debian)
                sudo apt-get remove -y podman buildah skopeo
                ;;
            fedora)
                sudo dnf remove -y podman buildah skopeo
                ;;
            rhel|centos|ol|almalinux)
                sudo dnf remove -y podman buildah skopeo cri-o
                ;;
            arch)
                sudo pacman -Rs --noconfirm podman buildah skopeo
                ;;
            opensuse*|suse)
                sudo zypper rm -y podman buildah skopeo
                ;;
            *)
                echo "No removal instructions for OS '$ID'. Skipping Podman removal."
                ;;
        esac
    else
        echo "Podman is not installed, skipping removal."
    fi
}

# Remove Podman before installing Docker
remove_podman

# Function for apt-based distributions (Ubuntu, Debian)
install_docker_apt() {
    echo "Using apt to install Docker on $NAME..."
    sudo apt-get update
    sudo apt-get install -y apt-transport-https ca-certificates curl software-properties-common
    # Add Docker’s official GPG key and repository
    curl -fsSL https://download.docker.com/linux/${ID}/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
    codename=$(lsb_release -cs)
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/${ID} $codename stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    sudo apt-get update
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io
}

# Function for dnf-based Fedora
install_docker_fedora() {
    echo "Using dnf to install Docker on Fedora..."
    sudo dnf -y install dnf-plugins-core
    sudo dnf config-manager --add-repo https://download.docker.com/linux/fedora/docker-ce.repo
    sudo dnf -y install docker-ce docker-ce-cli containerd.io
}

# Function for dnf/yum-based distributions (RHEL, CentOS, Oracle Linux, AlmaLinux)
install_docker_rhel() {
    echo "Using dnf/yum to install Docker on RHEL/CentOS/Oracle Linux/AlmaLinux..."
    if command -v dnf >/dev/null 2>&1; then
        sudo dnf -y install yum-utils
        sudo dnf config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
        sudo dnf -y install docker-ce docker-ce-cli containerd.io
    elif command -v yum >/dev/null 2>&1; then
        sudo yum install -y yum-utils
        sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
        sudo yum install -y docker-ce docker-ce-cli containerd.io
    else
        echo "Neither dnf nor yum found. Cannot install Docker on this system."
        exit 1
    fi
}

# Function for Arch Linux using pacman
install_docker_arch() {
    echo "Using pacman to install Docker on Arch Linux..."
    sudo pacman -Syu --noconfirm docker
}

# Function for openSUSE using zypper
install_docker_opensuse() {
    echo "Using zypper to install Docker on openSUSE..."
    sudo zypper refresh
    sudo zypper install -y docker
}

# Fallback: use Docker's official installation script
install_docker_script() {
    echo "Falling back to Docker's convenience script..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    rm get-docker.sh
}

# Main installation logic based on $ID
case "$ID" in
    ubuntu|debian)
        install_docker_apt
        ;;
    fedora)
        install_docker_fedora
        ;;
    rhel|centos|ol|almalinux)
        install_docker_rhel
        ;;
    arch)
        install_docker_arch
        ;;
    opensuse*|suse)
        install_docker_opensuse
        ;;
    *)
        echo "OS '$ID' is not explicitly supported. Using the convenience script."
        install_docker_script
        ;;
esac

echo "Starting Docker service..."
sudo systemctl start docker
echo "Enabling Docker to start on boot..."
sudo systemctl enable docker

echo "Docker installation completed successfully."
