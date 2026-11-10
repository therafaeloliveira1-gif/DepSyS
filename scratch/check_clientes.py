import fdb

con = fdb.connect(dsn=r'C:\WorkSpace\motos-mendes-data\FB_DATA\FB_DADOS.FDB', user='SYSDBA', password='masterkey', charset='WIN1252')
cur = con.cursor()

# Tablas de clientes o cadastros
cur.execute("""
    SELECT RDB$RELATION_NAME 
    FROM RDB$RELATIONS 
    WHERE RDB$SYSTEM_FLAG=0 
    ORDER BY RDB$RELATION_NAME
""")
all_tables = [r[0].strip() for r in cur.fetchall()]

target_tables = [t for t in all_tables if any(k in t for k in ['CLI', 'CAD', 'PESSOA', 'CONTATO', 'END'])]
print("--- Tablas encontradas ---")
for t in target_tables:
    try:
        cur.execute(f"SELECT COUNT(*) FROM {t}")
        cnt = cur.fetchone()[0]
        print(f"{t}: {cnt} registros")
    except Exception as e:
        print(f"{t}: error {e}")

# Ver columnas de CAD_CLIENTE
print("\n--- Columnas de CAD_CLIENTE ---")
cur.execute("""
    SELECT RDB$FIELD_NAME 
    FROM RDB$RELATION_FIELDS 
    WHERE RDB$RELATION_NAME = 'CAD_CLIENTE'
""")
fields = [r[0].strip() for r in cur.fetchall()]
print(", ".join(fields[:30]))

# Ver si hay filtros de status o tipo
cur.execute("SELECT COUNT(*) FROM CAD_CLIENTE")
print(f"Total CAD_CLIENTE: {cur.fetchone()[0]}")

for col in ['STATUS', 'ATIVO', 'SITUACAO', 'BLOQUEADO', 'CANCELADO']:
    if col in fields:
        cur.execute(f"SELECT {col}, COUNT(*) FROM CAD_CLIENTE GROUP BY {col}")
        print(f"Valores de {col}:", cur.fetchall())

con.close()
