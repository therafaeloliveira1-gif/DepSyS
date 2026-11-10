import fdb

con = fdb.connect(dsn=r'C:\WorkSpace\motos-mendes-data\FB_DATA\FB_DADOS.FDB', user='SYSDBA', password='masterkey', charset='WIN1252')
cur = con.cursor()

# Ver columnas de V_CAD_CLIENTE
cur.execute("""
    SELECT RDB$FIELD_NAME 
    FROM RDB$RELATION_FIELDS 
    WHERE RDB$RELATION_NAME = 'V_CAD_CLIENTE'
""")
fields = [r[0].strip() for r in cur.fetchall()]
print("Columnas V_CAD_CLIENTE:", fields)

# Ver definición de vista V_CAD_CLIENTE
cur.execute("""
    SELECT RDB$VIEW_SOURCE 
    FROM RDB$RELATIONS 
    WHERE RDB$RELATION_NAME = 'V_CAD_CLIENTE'
""")
res = cur.fetchone()
if res and res[0]:
    print("\n--- Definición de V_CAD_CLIENTE ---")
    print(res[0])

# Ver también cómo se consultan clientes en los endpoints de Motos Mendes PHP o scripts existentes
con.close()
