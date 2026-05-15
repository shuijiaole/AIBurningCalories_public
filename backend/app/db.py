from __future__ import annotations

from contextlib import contextmanager

from .config import settings

try:
    import pymysql
    from pymysql.cursors import DictCursor
except ImportError:  # pragma: no cover
    pymysql = None
    DictCursor = None


def get_connection():
    if pymysql is None:
        raise RuntimeError(
            "PyMySQL is not installed. Run `pip install -r backend/requirements.txt` first."
        )

    return pymysql.connect(
        host=settings.mysql_host,
        port=settings.mysql_port,
        user=settings.mysql_user,
        password=settings.mysql_password,
        database=settings.mysql_database,
        charset=settings.mysql_charset,
        cursorclass=DictCursor,
        autocommit=False,
    )


@contextmanager
def db_session(*, commit: bool = False):
    connection = get_connection()
    cursor = connection.cursor()
    try:
        yield connection, cursor
        if commit:
            connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        cursor.close()
        connection.close()

