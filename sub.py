'''
用于生成订阅链接
'''

import requests

'''
base url
http://127.0.0.1:25500/sub?target=%TARGET%&url=%URL%&emoji=%EMOJI%····
doc: https://github.com/tindy2013/subconverter/blob/master/README-cn.md#%E8%BF%9B%E9%98%B6%E9%93%BE%E6%8E%A5
'''

def subconverter(subconverter_url: str, config_url: str, subs: list[str]): 
    return requests.Request("GET", subconverter_url, params={
        'filename': 'MoleSub',
        'target': 'clash', 
        'config': config_url, 
        'url': '||'.join(subs),
    }).prepare()

if __name__ == '__main__' :
    subconverter_url = 'http://127.0.0.1:25500/sub'
    config_url = 'https://raw.githubusercontent.com/mole828/MoleRuleSwitcher/main/main_rule.ini'
    subs = ['tag:test,http://xxx']
    print(subconverter(subconverter_url,config_url,subs).url)