import fdb

con = fdb.connect(
    host='192.168.1.10',
    port=3050,
    database=r'C:\System\SGLoja\Dados\FB_DADOS.FDB',
    user='sysdba',
    password='key2624',
    charset='NONE'
)
cur = con.cursor()

def ver_columnas(tabla):
    cur.execute(f"""
        SELECT TRIM(RDB$FIELD_NAME) 
        FROM RDB$RELATION_FIELDS 
        WHERE RDB$RELATION_NAME = '{tabla}'
        ORDER BY RDB$FIELD_POSITION
    """)
    return [r[0] for r in cur.fetchall()]

cols_resc = ver_columnas('MOV_RESC')

cur.execute("SELECT * FROM MOV_RESC WHERE NUMRES = 46826")
row = cur.fetchone()
print("--- MOV_RESC NUMRES = 46826 (Captura 1) ---")
for c, v in zip(cols_resc, row):
    if v is not None:
        print(f"  {c}: {v}")

cur.execute("SELECT * FROM MOV_RESC WHERE NUMRES = 46751")
row2 = cur.fetchone()
print("\n--- MOV_RESC NUMRES = 46751 (Captura 2) ---")
for c, v in zip(cols_resc, row2):
    if v is not None:
        print(f"  {c}: {v}")

cols_resi = ver_columnas('MOV_RESI')
print("\nColumnas de MOV_RESI (Items):", cols_resi)

cur.execute("SELECT * FROM MOV_RESI WHERE NUMRES = 46826")
print("\nItems de 46826 en MOV_RESI:")
for r in cur.fetchall():
    print(r)

con.close()
