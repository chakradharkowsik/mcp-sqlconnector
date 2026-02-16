import { DbDialect } from '../models/DatabaseModels.js';

export class QuerySanitizer {
    private static readonly FORBIDDEN_KEYWORDS = [
        "UPDATE ", "DELETE ", "DROP ", "CREATE ", "ALTER ", "TRUNCATE ", "EXEC ", "EXECUTE ", "MERGE ", "INSERT "
    ];

    static sanitize(sql: string): string {
        const trimmedSql = sql.trim();
        const upperSql = trimmedSql.toUpperCase();

        if (!upperSql.startsWith("SELECT") && !upperSql.startsWith("WITH")) {
            throw new Error("Only SELECT or WITH statements are allowed.");
        }

        // Improved semicolon detection: block multiple statements
        // We only allow a trailing semicolon if it's the very last character (excluding whitespace)
        // This is still complex to do perfectly without a parser, but we can look for suspicious patterns
        if (trimmedSql.split(';').filter(part => part.trim().length > 0).length > 1) {
            throw new Error("Multiple statements are not allowed.");
        }

        if (this.FORBIDDEN_KEYWORDS.some(word => upperSql.includes(word))) {
            throw new Error("Forbidden DML/DDL keywords detected.");
        }

        return trimmedSql;
    }

    static applyConstraints(sql: string, dialect: DbDialect): string {
        let constrainedSql = sql;

        // Force TOP 100
        const upperSql = constrainedSql.toUpperCase();
        if (!upperSql.includes("TOP") && !upperSql.includes("LIMIT")) {
            if (dialect === DbDialect.MSSQL) {
                constrainedSql = constrainedSql.replace(/SELECT(\s+DISTINCT)?/i, "$& TOP 100");
            } else {
                if (!upperSql.includes("LIMIT")) {
                    constrainedSql += " LIMIT 100";
                }
            }
        }

        // Inject WITH (NOLOCK) - MSSQL only
        if (dialect === DbDialect.MSSQL && !upperSql.includes("NOLOCK")) {
            // Only apply to simple FROM clauses to avoid breaking complex JOINs
            constrainedSql = constrainedSql.replace(/(FROM\s+[\w\.\[\]"]+)(?!\s*WITH\s*\(NOLOCK\))/i, "$1 WITH (NOLOCK)");
        }

        return constrainedSql;
    }
}
