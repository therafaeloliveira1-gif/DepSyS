import fdb

con = fdb.connect(dsn="192.168.1.10/3050:C:\\SYSTEM\\SGLOJA\\DADOS\\FB_DADOS.FDB", user="sysdba", password="key2624", charset="WIN1252")
cur = con.cursor()

print("--- Clientes en CAD_CLIENTE ---")
cur.execute("SELECT COUNT(*) FROM CAD_CLIENTE")
print("Total CAD_CLIENTE:", cur.fetchone()[0])

cur.execute("SELECT INATIVO, COUNT(*) FROM CAD_CLIENTE GROUP BY INATIVO")
print("Por INATIVO:", cur.fetchall())

# Ver clientes en MOV_SAIC (pedidos)
cur.execute("SELECT COUNT(DISTINCT CODCLIENTE) FROM MOV_SAIC")
print("Clientes distintos en MOV_SAIC (pedidos):", cur.fetchone()[0])

cur.execute("""
    SELECT COUNT(DISTINCT m.CODCLIENTE) 
    FROM MOV_SAIC m 
    LEFT JOIN CAD_CLIENTE c ON m.CODCLIENTE = c.CODCLIENTE 
    WHERE c.CODCLIENTE IS NULL
""")
print("Clientes en MOV_SAIC sin CAD_CLIENTE:", cur.fetchone()[0])

# Columnas de CAD_CLIRUC
cur.execute("""
    SELECT RDB$FIELD_NAME 
    FROM RDB$RELATION_FIELDS 
    WHERE RDB$RELATION_NAME = 'CAD_CLIRUC'
""")
fields_ruc = [r[0].strip() for r in cur.fetchall()]
print("Columnas CAD_CLIRUC:", fields_ruc)

cur.execute("SELECT COUNT(*) FROM CAD_CLIRUC")
print("Total CAD_CLIRUC:", cur.fetchone()[0])

cur.execute("SELECT FIRST 3 * FROM CAD_CLIRUC")
print("Muestra CAD_CLIRUC:", cur.fetchall())

con.close()
