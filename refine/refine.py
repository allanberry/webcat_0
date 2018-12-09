import yaml

with open("config.yaml", 'r') as stream:
    try:
        print(yaml.load(stream))
    except yaml.YAMLError as err:
        print(err)