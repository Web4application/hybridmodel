#!/bin/bash

# Check if running on a supported system
case "$(uname -s)" in
  Linux)
    if [[ -f "/etc/lsb-release" ]]; then
      . /etc/lsb-release
      if [[ "$DISTRIB_ID" != "Ubuntu" ]]; then
        echo "This script only works on Ubuntu, not $DISTRIB_ID."
        exit 1
      fi
    else
      if [[ !"$(cat /etc/*-release | grep '^ID=')" =~ ^(ID=\"ubuntu\")|(ID=\"centos\")|(ID=\"arch\")|(ID=\"debian\")$ ]]; then
        echo "Unsupported Linux distribution."
        exit 1
      fi
    fi
    ;;
  Darwin)
    echo "Running on MacOS."
    ;;
  *)
    echo "Unsupported operating system."
    exit 1
    ;;
esac

# Check if needed dependencies are installed and install if necessary
if ! command -v node >/dev/null || ! command -v git >/dev/null || ! command -v yarn >/dev/null; then
  case "$(uname -s)" in
    Linux)
      if [[ "$(cat /etc/*-release | grep '^ID=')" = "ID=ubuntu" ]]; then
        sudo apt-get update
        sudo apt-get -y install nodejs git yarn
      elif [[ "$(cat /etc/*-release | grep '^ID=')" = "ID=debian" ]]; then
        sudo apt-get update
        sudo apt-get -y install nodejs git yarn
      elif [[ "$(cat /etc/*-release | grep '^ID=')" = "ID=centos" ]]; then
        sudo yum -y install epel-release
        sudo yum -y install nodejs git yarn
      elif [[ "$(cat /etc/*-release | grep '^ID=')" = "ID=arch" ]]; then
        sudo pacman -Syu -y
        sudo pacman -S -y nodejs git yarn
      else
        echo "Unsupported Linux distribution"
        exit 1
      fi
      ;;
    Darwin)
      /usr/bin/ruby -e "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install)"
      brew install node git yarn
      ;;
  esac
fi

# Clone the repository and install dependencies
git clone https://github.com/Yidadaa/ChatGPT-Next-Web
cd ChatGPT-Next-Web
yarn install

# Prompt user for environment variables
read -p "Enter OPENAI_API_KEY: " OPENAI_API_KEY
read -p "Enter CODE: " CODE
read -p "Enter PORT: " 80

# Build and run the project using the environment variables
OPENAI_API_KEY=$OPENAI_API_KEY CODE=$CODE PORT=$PORT yarn build
OPENAI_API_KEY=$OPENAI_API_KEY CODE=$CODE PORT=$PORT yarn start

"docker login nvcr.io
Username: admin
Password: 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
Key: github_assets
RequestId: KNN9EA0FY7HWXR0E
HostId: ckZZJHh5isb3pxSZuxdeORPN7BcgZpT9aQLwTHeMffjSpRZSA6myx8jo0ES/hh/tYznQuc7ETJa6VHpauFJ6mSxRKvivtGKa


{
  "name": "App",
  "type": "app",
  "version": "2.0.0",
  "categories": ["development"],
  "description": "App description here",
  "entrypoint": "python -m uvicorn src.main:app --host 0.0.0.0 --port 8000"
  "task_location": "workspace_tasks",
  "icon": "https://icon.png",
  "poster": "https://poster.png"
}

mkdir -p ~/esp
cd ~/esp
git clone -b v5.5.1 --recursive https://github.com/espressif/esp-idf.git

cd ~/esp/esp-idf
./install.sh esp32c3

cd ~/esp/esp-idf
./install.sh esp32,esp32s2

cd ~/esp/esp-idf
./install.fish esp32,esp32s2

cd ~/esp/esp-idf
./install.fish all

cd ~/esp/esp-idf
./install.sh all

cd ~/esp/esp-idf
export IDF_GITHUB_ASSETS="
dl.espressif.com/github_assets
"
./install.sh

$ idf.py build
Running cmake in directory /path/to/hello_world/build
Executing "cmake -G Ninja --warn-uninitialized /path/to/hello_world"...
Warn about uninitialized values.
-- Found Git: /usr/bin/git (found version "2.17.0")
-- Building empty aws_iot component due to configuration
-- Component names: ...
-- Component paths: ...

... (more lines of build system output)

[527/527] Generating hello_world.bin
esptool.py v2.3.1

Project build complete. To flash, run this command:
../../../components/esptool_py/esptool/esptool.py -p (PORT) -b 921600 write_flash --flash_mode dio --flash_size detect --flash_freq 40m 0x10000 build/hello_world.bin  build 0x1000 build/bootloader/bootloader.bin 0x8000 build/partition_table/partition-table.bin
or run 'idf.py -p PORT flash'


apt-get install -y nodejs npm chromium jq
npm install -g lighthouse

# Run lighthouse as JSON, pipe it to jq to wrangle and send it to GitHub Gist via curl
# so Lighthouse Viewer can grab it.
lighthouse "http://localhost" --chrome-flags="--no-sandbox --headless" \
  --output json \
| jq -r "{ description: \"gh.io\", public: \"false\", files: {\"$(date "+%Y%m%d").lighthouse.report.json\": {content: (. | tostring) }}}" \
| curl -sS -X POST -H 'Content-Type: application/json' \
    -u ${web4application}:${GITHUB_TOKEN} \
    -d @- https://api.gh.io/gists > results.gist

# Let's be nice and add the Lighthouse Viewer link in the Gist description.
GID=$(cat results.gist | jq -r '.id') && \
curl -sS -X POST -H 'Content-Type: application/json' \
  -u ${web4application}:${GITHUB_TOKEN} \
  -d "{ \"description\": \"web4application - Lighthouse: https://googlechrome.gh.io/lighthouse/viewer/?gist=${GID}\" }" "https://api.github.com/gists/${GID}" > updated.gist
