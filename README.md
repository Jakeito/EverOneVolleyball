# EverOne Volleyball Bot

Discord bot for the church volleyball group. Posts a bi-weekly Thursday RSVP
poll, lets members `+name` up to 2 guests each in chat, routes anything over
that limit to admins for approval, and posts a prioritized roster (capped at
30, then waitlist) every Wednesday or on demand.

## How it works

- **`/volleyballpoll`** — posts a native Discord poll titled `Volleyball
  <M/D>` (next upcoming Thursday) with answers `Yes` / `Yes, but watching`.
  Opens a new poll cycle; only one can be open at a time.
- **Chat parsing** (in the configured channel only, while a poll is open):
  - `+alex +chris`, `+Brad & Justin`, `+1 abigail bro`, `+aaron n +jack`,
    etc. — adds guests. First 2 active (approved/pending) guests per member
    are auto-approved (✅ reaction). Anything past 2 is posted as a pending
    approval request with Approve/Reject buttons, pinging the admin role.
  - `-chris` — cancels a guest you added (➖ reaction). Deleting your
    message cancels every guest it added too.
- **`/generatelist`** (or automatically every Wednesday) — posts the roster:
  members who voted Yes (in vote order), then approved guests (in request
  order), capped at `ROSTER_CAP` (default 30), with the rest listed as a
  waitlist. This also closes the poll cycle.

All state (poll cycle, votes, guest invites, pending requests) lives in a
local SQLite file (`data.sqlite`), so the bot survives restarts.

## 1. Create the Discord application

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications) → **New Application**.
2. Under **Bot**, click **Reset Token** and copy it → this is `DISCORD_TOKEN`.
3. On the same **Bot** page, enable these **Privileged Gateway Intents**:
   - **Server Members Intent** (needed to resolve display names)
   - **Message Content Intent** (needed to read `+name` / `-name` text)
4. Under **OAuth2 → General**, copy the **Application ID** → this is `DISCORD_CLIENT_ID`.
5. Under **OAuth2 → URL Generator**:
   - Scopes: `bot`, `applications.commands`
   - Bot permissions: `Send Messages`, `Read Message History`, `Add Reactions`,
     `Use Slash Commands`, `Embed Links`, `Manage Messages` (optional, only if
     you want the bot itself able to resolve requests), `View Channels`
   - Open the generated URL and invite the bot to your server.
6. Get your **Guild ID** (server) and the **Channel ID** for the volleyball
   channel: enable Developer Mode in Discord (User Settings → Advanced),
   then right-click the server/channel → **Copy ID**.
7. (Optional) If you want a specific role — rather than just "Manage
   Messages" permission — to approve/reject guest requests, copy that role's
   ID for `ADMIN_ROLE_ID`.

## 2. Configure the bot

```bash
cp .env.example .env
```

Fill in `.env`:

```
DISCORD_TOKEN=...
DISCORD_CLIENT_ID=...
DISCORD_GUILD_ID=...
VOLLEYBALL_CHANNEL_ID=...
ADMIN_ROLE_ID=            # optional
ROSTER_CAP=30
GENERATE_LIST_CRON=0 18 * * 3   # Wed 6pm server-local time
TIMEZONE=America/Los_Angeles
```

## 3. Run it locally

```bash
npm install
npm run deploy-commands   # registers /volleyballpoll and /generatelist
npm start
```

## 4. Hosting on Oracle Cloud (Always Free tier works fine)

This bot is a single lightweight always-on Node process — an Oracle Cloud
**Always Free** Ampere (ARM) or micro VM instance is plenty.

### 4.1 Create the VM

1. Oracle Cloud Console → **Compute → Instances → Create Instance**.
2. Pick an **Always Free** shape (e.g. `VM.Standard.A1.Flex`, 1 OCPU / 6GB is
   overkill but free) and an Ubuntu image.
3. Add your SSH public key (or let Oracle generate a key pair for you).
4. Create, then note the instance's **public IP**.
5. In the VM's subnet **Security List** (and the instance's own firewall if
   you need inbound ports — you don't for this bot, it only makes outbound
   connections to Discord), no inbound rules are required since Discord bots
   use outbound WebSocket/HTTPS only.

### 4.2 SSH in and install Node

```bash
ssh ubuntu@<public-ip>
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs build-essential git
node --version
```

(`build-essential` is needed because `better-sqlite3` compiles a small
native addon on install.)

### 4.3 Deploy the bot

```bash
git clone https://github.com/Jakeito/EverOneVolleyball.git
cd EverOneVolleyball
npm install
cp .env.example .env
nano .env   # fill in your token/IDs from step 2
npm run deploy-commands
```

### 4.4 Keep it running with systemd

Create `/etc/systemd/system/volleyball-bot.service`:

```ini
[Unit]
Description=EverOne Volleyball Discord Bot
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/EverOneVolleyball
ExecStart=/usr/bin/node src/index.js
Restart=on-failure
RestartSec=5
EnvironmentFile=/home/ubuntu/EverOneVolleyball/.env

[Install]
WantedBy=multi-user.target
```

Then:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now volleyball-bot
sudo systemctl status volleyball-bot
journalctl -u volleyball-bot -f   # tail logs
```

### 4.5 Deploying updates later

```bash
cd ~/EverOneVolleyball
git pull
npm install
npm run deploy-commands   # only needed if slash command definitions changed
sudo systemctl restart volleyball-bot
```

## Notes / limitations

- The `+name` parser is regex-based, not an LLM — it handles the common
  patterns (`+alex`, `+alex +chris`, `+Brad & Justin`, `+aaron n +jack`,
  `+1 abigail bro`) but very free-form phrasing may not parse as expected.
  If a message doesn't get a ✅/➖/⏳ reaction, the bot didn't detect a
  guest token in it.
- Only one poll cycle is open at a time; `/generatelist` closes the current
  cycle when it posts the roster (manually or via the Wednesday cron), so
  `/volleyballpoll` is ready to start the next one.
- "Yes, but watching" voters are listed separately at the bottom of the
  roster and don't count toward the 30-player cap.
