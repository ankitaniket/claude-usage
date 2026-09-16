# EC2 rollup cron

Runs the 5-hourly rollup against the Vercel backend. The Mac collector already
pushes usage every ~3h and refreshes the summary on each push; this cron is the
independent backstop that resets the 5h window and keeps the summary fresh even
when your laptop is closed.

## Setup on EC2

```bash
git clone https://github.com/ankitaniket/claude-usage.git
cd claude-usage/cron
cp .env.example .env      # fill DASHBOARD_URL + CRON_SECRET (matches Vercel env)
chmod +x rollup.sh
./rollup.sh               # test once — expect "HTTP 200 {...}"
```

## Install the cron (every 5 hours)

```bash
crontab -e
# add:
0 */5 * * * /home/ec2-user/claude-usage/cron/rollup.sh >> /home/ec2-user/claude-rollup.log 2>&1
```

The endpoint auth is a bearer token (`CRON_SECRET`) — the same value set as an
env var on the Vercel project. Nothing else is needed on the box.
