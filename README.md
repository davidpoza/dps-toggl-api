# dps-toggl-api

This is the api for the dps-toggl project

First of all you must create *.env* file with these variables:
```
MONGO_URI="mongodb+srv://user:password@server/database"

# server port
PORT=3000

# secret for encryption of jwt signature
JWT_SECRET=yoursecret

# number of rounds for Blowfish algorithm for hashing user password
BCRYPT_ROUNDS=12

# lifetime of the token (in seconds)
JWT_LIFETIME=86400

# algorithm used in token signing
JWT_ALGORITHM=HS256

# level of logging
LOG_LEVEL=info

# avatar upload dir
UPLOAD_DIR="uploads"

# avatar size limit in MB
AVATAR_SIZE_LIMIT=2
```