import os
import sys
import fdb
import pymysql
from decimal import Decimal

sys.stdout.reconfigure(encoding='utf-8')

def get_fb_connection():
    connections = [
        {"dsn": "192.168.1.10/3050:C:\\SYSTEM\\SGLOJA\\DADOS\\FB_DADOS.FDB", "user": "sysdba", "password": "key2624"},
        {"dsn": "192.168.1.10/3050:C:\\SYSTEM\\SGLOJA\\DADOS\\FB_DADOS.FDB", "user": "sysdba", "password": "masterkey"},
        {"dsn": r"C:\WorkSpace\motos-mendes-data\FB_DATA\FB_DADOS.FDB", "user": "sysdba", "password": "masterkey"}
    ]
    for conn in connections:
        try:
            print(f"Intentando conectar a Firebird: {conn['dsn']}...")
            con = fdb.connect(dsn=conn["dsn"], user=conn["user"], password=conn["password"], charset="WIN1252")
            print(f"[OK] Conectado exitosamente a Firebird ({conn['dsn']})")
            return con
        except Exception as e:
            print(f"  Fallo conexion a {conn['dsn']}: {e}")
    raise Exception("No se pudo conectar a ninguna instancia de Firebird")

def main():
    print("==========================================================")
    print("  SINCRONIZADOR COMPLETO: FIREBIRD -> MYSQL (mendes_db)  ")
    print("==========================================================")

    fb_con = get_fb_connection()
    fb_cur = fb_con.cursor()

    my_con = pymysql.connect(
        host="localhost",
        user="Rafael",
        password="Mendes-1734*",
        database="mendes_db",
        charset="utf8mb4",
        cursorclass=pymysql.cursors.DictCursor,
        autocommit=False
    )
    my_cur = my_con.cursor()

    # ----------------------------------------------------
    # 1. SINCRONIZAR CLIENTES (TODOS SIN EXCEPCIÓN)
    # ----------------------------------------------------
    print("\n[1/2] Extrayendo Clientes desde Firebird...")
    sql_clientes = """
        SELECT 
            c.CODCLIENTE,
            c.NOME,
            c.RAZAOSOCIAL,
            c.DOCFISCAL,
            c.EMAIL1,
            COALESCE(c.NUMTELEFONE1, c.NUMTELEFONE2, c.NUMTELEFONE3) AS TELEFONO,
            c.CODVEND,
            v.NOMEVEND,
            c.VLMAXCREDITO,
            c.CODCOND,
            COALESCE(c.INATIVO, 'N') AS INATIVO,
            c.ENDERLOGRAD,
            c.ENDERBAIRRO
        FROM CAD_CLIENTE c
        LEFT JOIN CAD_VEND v ON c.CODVEND = v.CODVEND
        ORDER BY c.CODCLIENTE ASC
    """
    fb_cur.execute(sql_clientes)
    clientes_fb = fb_cur.fetchall()
    print(f"  Total clientes leídos desde Firebird: {len(clientes_fb)}")

    insert_cli_sql = """
        INSERT INTO tbl_clientes (
            codigo, nombre, razon_social, ruc, email, telefono,
            vendedor_codigo, vendedor_nombre, limite_credito, saldo_disponible,
            condicion_pago_codigo, condicion_pago, inactivo, direccion
        ) VALUES (
            %s, %s, %s, %s, %s, %s,
            %s, %s, %s, %s,
            %s, %s, %s, %s
        ) ON DUPLICATE KEY UPDATE
            nombre = VALUES(nombre),
            razon_social = VALUES(razon_social),
            ruc = VALUES(ruc),
            email = VALUES(email),
            telefono = VALUES(telefono),
            vendedor_codigo = VALUES(vendedor_codigo),
            vendedor_nombre = VALUES(vendedor_nombre),
            limite_credito = VALUES(limite_credito),
            saldo_disponible = VALUES(saldo_disponible),
            condicion_pago_codigo = VALUES(condicion_pago_codigo),
            condicion_pago = VALUES(condicion_pago),
            inactivo = VALUES(inactivo),
            direccion = VALUES(direccion)
    """

    cli_values = []
    for r in clientes_fb:
        cod = int(r[0])
        nome = (r[1] or '').strip()
        razao = (r[2] or '').strip()
        ruc = (r[3] or '').strip()
        email = (r[4] or '').strip()
        tel = (r[5] or '').strip()
        codvend = int(r[6] or 0)
        nomevend = (r[7] or '').strip()
        cred = float(r[8] or 0.0)
        codcond = int(r[9] or 1)
        inativo = (r[10] or 'N').strip()
        
        # Condicion de pago
        cond_str = 'CONTADO'
        if cred > 0:
            if codcond == 9:
                cond_str = 'CREDITO 90 DIAS'
            elif codcond == 6:
                cond_str = 'CREDITO 30 DIAS'
            else:
                cond_str = f'CREDITO (COND {codcond})'

        dir_completa = f"{(r[11] or '').strip()} {(r[12] or '').strip()}".strip()

        cli_values.append((
            cod, nome, razao, ruc, email, tel,
            codvend, nomevend, cred, cred,
            codcond, cond_str, inativo, dir_completa
        ))

    my_cur.executemany(insert_cli_sql, cli_values)
    my_con.commit()
    print(f"  [OK] {len(cli_values)} clientes guardados/actualizados en tbl_clientes.")

    # ----------------------------------------------------
    # 2. SINCRONIZAR PRODUCTOS Y STOCK
    # ----------------------------------------------------
    print("\n[2/2] Extrayendo Productos y Stock desde Firebird...")
    sql_productos = """
        SELECT 
            p.CODPROD,
            p.DESCRICAO,
            p.CODBAR,
            p.UNIDMEDIDA,
            p.VLPRECO1,
            q.QTFISICA,
            q.QTRESERVA,
            (COALESCE(q.QTFISICA, 0) - COALESCE(q.QTRESERVA, 0)) AS DISPONIBLE
        FROM PRD_PRODUTO p
        LEFT JOIN PRD_QTDE q ON p.CODPROD = q.CODPROD
        ORDER BY p.CODPROD ASC
    """
    fb_cur.execute(sql_productos)
    prods_fb = fb_cur.fetchall()
    print(f"  Total productos leídos desde Firebird: {len(prods_fb)}")

    insert_prod_sql = """
        INSERT INTO tbl_productos (
            codigo, descripcion, codigo_barras, unidad_medida,
            precio_venta, stock_fisico, stock_reservado, stock_disponible
        ) VALUES (
            %s, %s, %s, %s,
            %s, %s, %s, %s
        ) ON DUPLICATE KEY UPDATE
            descripcion = VALUES(descripcion),
            codigo_barras = VALUES(codigo_barras),
            unidad_medida = VALUES(unidad_medida),
            precio_venta = VALUES(precio_venta),
            stock_fisico = VALUES(stock_fisico),
            stock_reservado = VALUES(stock_reservado),
            stock_disponible = VALUES(stock_disponible)
    """

    prod_values = []
    for p in prods_fb:
        cod = str(p[0]).strip()
        desc = (p[1] or '').strip()
        codbar = (p[2] or '').strip()
        unid = (p[3] or 'UN').strip()
        precio = float(p[4] or 0.0)
        qtfis = float(p[5] or 0.0)
        qtres = float(p[6] or 0.0)
        qtdisp = float(p[7] or 0.0)

        prod_values.append((
            cod, desc, codbar, unid,
            precio, qtfis, qtres, qtdisp
        ))

    my_cur.executemany(insert_prod_sql, prod_values)
    my_con.commit()
    print(f"  [OK] {len(prod_values)} productos y stocks guardados/actualizados en tbl_productos.")

    fb_con.close()
    my_con.close()
    print("\n==========================================================")
    print("  ¡SINCRONIZACIÓN FIREBIRD -> MYSQL COMPLETADA CON ÉXITO! ")
    print("==========================================================")

if __name__ == "__main__":
    main()
