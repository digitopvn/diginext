# CLI Configuration - Command Usage

Store & modify **Diginext CLI** config on your local machine.

## Examples

View current configuration:
```
diginext config get
```

View current cloud provider
```
diginext config provider current
```

## Usage

- View current CLI configuration

    ```
    diginext config get
    ```

    Output as JSON: `diginext config get -o json`
    _

- Cloud provider:

    List all providers
    ```
    diginext config provider ls
    diginext config provider list
    ```

    Add new provider (is the same with `diginext <provider-name> auth [...options]`)

    Get current provider: `diginext config provider current`
    _

- Git provider:

    List all providers
    ```
    diginext config git ls
    diginext config git list
    ```

    Add new provider 
    ```
    diginext config git auth <github|bitbucket|gitlab>
    ```

    Get current provider
    ```
    diginext config git current
    ```
    _

- Database:

    List all available databases
    ```
    diginext config db ls
    diginext config db list
    diginext config database ls
    diginext config database list
    ```

    Add new database:
    `diginext config db add --name=<NAME> --host=<HOST> --user=<USER> --pass=<PASS> --port=<PORT>`
    _

More documentation: 
-
`diginext --help` or `di -h`