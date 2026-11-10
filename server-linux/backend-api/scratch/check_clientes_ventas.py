import fdb

con = fdb.connect(dsn=r'c:\WorkSpace\System\SGLoja\Dados\FB_DADOS.FDB', user='SYSDBA', password='masterkey', charset='ISO8859_1')
cur = con.cursor()

# 1. Clientes distintos en MOV_RESC (Pedidos)
cur.execute("SELECT COUNT(DISTINCT CODCLIENTE) FROM MOV_RESC WHERE CODCLIENTE IS NOT NULL")
print("Clientes distintos en MOV_RESC (Pedidos):", cur.fetchone()[0])

# 2. Clientes distintos en ventas/facturas (MOV_SAIC)
try:
    cur.execute("SELECT COUNT(DISTINCT CODCLIENTE) FROM MOV_SAIC WHERE CODCLIENTE IS NOT NULL")
    print("Clientes distintos en MOV_SAIC (Ventas/Facturas):", cur.fetchone()[0])
except Exception as e:
    print("MOV_SAIC err:", e)

# 3. ¿Hay otras tablas de personas o clientes?
cur.execute("""
    SELECT RDB$RELATION_NAME 
    FROM RDB$RELATIONS 
    WHERE RDB$SYSTEM_FLAG = 0 AND RDB$RELATION_NAME LIKE '%CLI%'
""")
for r in cur.fetchall():
    tname = r[0].strip()
    try:
        cur.execute(f"SELECT COUNT(*) FROM {tname}")
        print(f"  {tname}: {cur.fetchone()[0]}")
    except:
        pass

con.close()
