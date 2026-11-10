import fdb, time

c = fdb.connect(dsn='192.168.1.10:C:\\System\\SGLoja\\Dados\\FB_DADOS.FDB', user='sysdba', password='key2624', charset='WIN1252')
cur = c.cursor()
t0 = time.time()
cur.execute('''
    SELECT FIRST 50
        r.NUMRES, r.DATARES, r.CODPESSOA, r.NOMEPESSOA, 
        r.CODVEND, r.VLTOTMOV, r.VLTOTDESC, r.OBS, r.CODCOND, r.QTMOV
    FROM MOV_RESC r
    WHERE r.DATARES >= CURRENT_DATE - 3 AND r.CODSITUACAO = 1 AND r.CODOPER = 13
    ORDER BY r.DATARES DESC, r.NUMRES DESC
''')
rows = cur.fetchall()
print(f'Retornadas {len(rows)} filas en {time.time()-t0:.2f}s:')
for r in rows[:5]:
    print(r)
c.close()
