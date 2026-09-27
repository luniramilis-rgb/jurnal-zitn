CREATE DATABASE jurnal_zitn_test;
CREATE DATABASE jurnal_zitn_test_migrate;

CREATE ROLE jurnal_zitn_test_user NOINHERIT NOSUPERUSER LOGIN PASSWORD 'jurnal_zitn_test_user';
GRANT CONNECT ON DATABASE jurnal_zitn_test_migrate TO jurnal_zitn_test_user;

\c jurnal_zitn_test_migrate
GRANT USAGE ON SCHEMA public TO jurnal_zitn_test_user;
