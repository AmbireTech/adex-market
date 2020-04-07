# Misc auxiliary scripts for the AdEx market

## cfupdate.sh
* Auto updates Cloudflare WAF rules to allow access to verified ethereum addresses

### Prerequisites
* CLOUDFLARE_TOKEN - a preconfigured Cloudflare API token with read-write access to 'Zone.Firewall Services'
* CLOUDFLARE_ZONEID - the ID of the Cloudflare DNS zone where the rule is applied
* CLOUDFLARE_FIREWALL_RULEID - the ID of a preconfigured [Cloudflare Firewall rule](https://api.cloudflare.com/#account-level-firewall-access-rule-list-access-rules); note, the script only updates the underlying filter thus making the firewall rule a placeholder for gathering data/statistics about the traffic blocked/allowed by the rule even when [filter updates](https://api.cloudflare.com/#filters-create-filters) happen

### Cron configuration
* The corresponding cron job needs to use `/bin/bash` (and not `/bin/sh`) as shell, e.g

```
# crontab -l
SHELL=/bin/bash
15  *   * * *      /root/market-filters/cfupdate.sh

```
