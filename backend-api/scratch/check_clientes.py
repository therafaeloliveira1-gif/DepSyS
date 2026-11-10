import fdb

con = fdb.connect(dsn=r'c:\WorkSpace\System\SGLoja\Dados\FB_DADOS.FDB', user='SYSDBA', password='masterkey', charset='ISO8859_1')
cur = con.cursor()

# Buscar tablas y vistas que contengan CLI, PESSOA, CAD o CLIENTE
cur.execute("""
    SELECT RDB$RELATION_NAME, RDB$VIEW_SOURCE 
    FROM RDB$RELATIONS 
    WHERE RDB$SYSTEM_FLAG = 0 
      AND (RDB$RELATION_NAME LIKE '%CLI%' OR RDB$RELATION_NAME LIKE '%PESSOA%' OR RDB$RELATION_NAME LIKE 'CAD_%')
    ORDER BY RDB$RELATION_NAME
""")
tables = cur.fetchall()
print('Tablas/Vistas encontradas:')
for t, is_view in tables:
    name = t.strip()
    try:
        cur.execute(f'SELECT COUNT(*) FROM {name}')
        cnt = cur.fetchone()[0]
        tipo = 'VISTA' if is_view else 'TABLA'
        print(f'  - {name} ({tipo}): {cnt} registros')
    except Exception as e:
        pass

con.close()
