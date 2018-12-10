import yaml
import json

config_path = 'config.yaml'
output_path = 'data.json'

# input data
with open(config_path, 'r') as infile:
    try:
        config_data = yaml.load(infile.read())
    except yaml.YAMLError as err:
        print(err)

organization_names = []
for s in config_data['sites']:
    org = s['parent_institution']
    if org not in organization_names:
        organization_names.append(org)

# output data
with open('organizations.json', 'w') as outfile:
    json.dump(organization_names, outfile)

