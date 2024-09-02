Instructions:

- run: docker-compose up --build
- run: DB scripts

DB scripts

-- create schema - jitta_card

CREATE SCHEMA IF NOT EXISTS jitta_card;

-- create table - users

CREATE table if not exists jitta_card.users (
id SERIAL PRIMARY KEY,
username VARCHAR(50) UNIQUE NOT NULL,
is_round_up BOOLEAN not null
);

-- create table - wallets

CREATE table if not exists jitta_card.wallets (
id SERIAL PRIMARY KEY,
user_id INT NOT NULL,
wallet_name VARCHAR(50) NOT NULL, -- MAIN, EARN, LOAN
balance DECIMAL(15, 2) NOT NULL,
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
FOREIGN KEY (user_id) REFERENCES jitta_card.users(id)
);

-- create table - transactions

CREATE TABLE if not exists jitta_card.transactions (
id SERIAL PRIMARY KEY,
from_wallet_id INT,
to_wallet_id INT,
amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
type VARCHAR(15) not null,
status VARCHAR(20) NOT NULL, -- 'pending', 'completed', 'failed'
remarks TEXT,
FOREIGN KEY (from_wallet_id) REFERENCES jitta_card.wallets(id),
FOREIGN KEY (to_wallet_id) REFERENCES jitta_card.wallets(id)
);
