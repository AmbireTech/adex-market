###############################################################################
# Adex Market Validator filters update
###############################################################################
#!/usr/bin/env bash
set -x
CF_TOKEN=${CLOUDFLARE_TOKEN}
CF_ZONEID=${CLOUDFLARE_ZONEID}
DOCKER_ID=`docker ps | grep root_market_1 | awk '{print $1}'`
FW_RULE_ID=${CLOUDFLARE_FIREWALL_RULEID}
# Testing rule - FW_RULE_ID="xxxx" # Testing rule

cd /root/market-filters
if [ -f cf_result.txt ]; then
        cp cf_result.txt cf_result_old.txt
fi

rm -f waf_rule.txt 
docker exec -i ${DOCKER_ID} /app/scripts/get-waf.js 2>&1 | tee waf_rule.txt
cat waf_rule.txt | grep http.host | sed $'s/"/\\\\"/g' > rule_data.txt

# Prepare new filter
rm -f cf_filter.txt cf_filter_final.txt
echo -n '[ {"expression": "' > cf_filter.txt
cat rule_data.txt >> cf_filter.txt
echo -n '","paused":false, "description" : "Market - only verified - automated filter"}]' >> cf_filter.txt
tr '\n' ' ' < cf_filter.txt >> cf_filter_final.txt
curl -X POST -H "Authorization: Bearer $CF_TOKEN"  -H "Content-Type: application/json" "https://api.cloudflare.com/client/v4/zones/$CF_ZONEID/filters" \
     --data "`cat cf_filter_final.txt`" > cf_filter_result.txt

FILTER_ID=`cat cf_filter_result.txt | jq .result[0].id | awk -F '"' '{print $2}'`
SUCCESS=`cat cf_filter_result.txt | jq .success`
if [ $SUCCESS == false ]; then
    echo "No new filter created ...Exiting..."
    exit 0
fi

OLD_FILTER_ID=`curl -X GET "https://api.cloudflare.com/client/v4/zones/$CF_ZONEID/firewall/rules/$FW_RULE_ID" -H "Authorization: Bearer $CF_TOKEN" -H "Content-Type: application/json"  | jq .result.filter.id | awk -F '"' '{print $2}'`
if [ $OLD_FILTER_ID == "null" ]; then
    echo "No old filter id found ...Exiting..."
    exit 255
fi

rm -f cf_rule.txt cf_rule_final.txt
echo -n '[{ "id" : "' > cf_rule.txt
echo -n $FW_RULE_ID >> cf_rule.txt
echo -n '", "filter":{"id":"' >> cf_rule.txt
echo -n $FILTER_ID >> cf_rule.txt
echo -n '", "expression":"' >> cf_rule.txt
cat rule_data.txt >> cf_rule.txt
# XXX: change log to block for actual rule
echo -n '","paused":false},"action":"block","priority":1450,"paused":false,"description":"Market - autogen - only verified - automated"}]' >> cf_rule.txt
tr '\n' ' ' < cf_rule.txt >> cf_rule_final.txt

curl -X PUT "https://api.cloudflare.com/client/v4/zones/$CF_ZONEID/firewall/rules" -H "Authorization: Bearer $CF_TOKEN" -H "Content-Type: application/json" --data "`cat cf_rule_final.txt`" > cf_result.txt
NEW_ID=`cat cf_result.txt | jq .result[0].id | awk -F '"' '{print $2}'` 
NEW_FILTER_ID=`cat cf_result.txt | jq .result[0].filter.id | awk -F '"' '{print $2}'`
# Delete the filter old filter only
if [ $NEW_ID == $FW_RULE_ID ] ; then
    if [ $OLD_FILTER_ID !=  $NEW_FILTER_ID ] ; then
		curl -X DELETE -H "Authorization: Bearer $CF_TOKEN" "https://api.cloudflare.com/client/v4/zones/$CF_ZONEID/filters/$OLD_FILTER_ID" > cf_delete_filter.txt
    fi
fi

