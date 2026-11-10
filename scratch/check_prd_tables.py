import fdb

con = fdb.connect(dsn="192.168.1.10/3050:C:\\SYSTEM\\SGLOJA\\DADOS\\FB_DADOS.FDB", user="sysdba", password="key2624", charset="WIN1252")
cur = con.cursor()

cur.execute("""
    SELECT RDB$FIELD_NAME 
    FROM RDB$RELATION_FIELDS 
    WHERE RDB$RELATION_NAME = 'PRD_PRODUTO'
""")
fields_prd = [r[0].strip() for r in cur.fetchall()]
print("Columnas PRD_PRODUTO:", fields_prd[:20])

cur.execute("""
    SELECT RDB$FIELD_NAME 
    FROM RDB$RELATION_FIELDS 
    WHERE RDB$RELATION_NAME = 'PRD_QTDE'
""")
fields_qtde = [r[0].strip() for r in cur.fetchall()]
print("Columnas PRD_QTDE:", fields_qtde[:20])

# Prueba de conteo
cur.execute("SELECT COUNT(*) FROM PRD_PRODUTO")
print("Total PRD_PRODUTO:", cur.fetchone()[0])

cur.execute("""
    SELECT FIRST 3 p.CODPROD, p.DESCRICAO, p.CODBAR, p.UNIDMEDIDA, q.QTFISICA, q.QTRESERVA
    FROM PRD_PRODUTO p
    LEFT JOIN PRD_QTDE q ON p.CODPROD = q.CODPROD
""")
print("Muestra stock:", cur.fetchall())

con.close()
