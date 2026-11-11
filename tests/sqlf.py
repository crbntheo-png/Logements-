import os,json,sys,urllib.request
q=open(sys.argv[1]).read() if sys.argv[1].endswith('.sql') else sys.argv[1]
r=urllib.request.Request('https://api.supabase.com/v1/projects/bcfcrqmpeyaoovluvhhn/database/query',data=json.dumps({'query':q}).encode(),headers={'Authorization':'Bearer '+os.environ['SUPABASE_ACCESS_TOKEN'],'Content-Type':'application/json'})
try: print(urllib.request.urlopen(r).read().decode())
except urllib.error.HTTPError as e: print('ERR',e.code,e.read().decode()[:2000])
