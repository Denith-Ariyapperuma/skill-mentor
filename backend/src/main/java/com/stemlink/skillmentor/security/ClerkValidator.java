package com.stemlink.skillmentor.security;

import com.auth0.jwk.Jwk;
import com.auth0.jwk.JwkProvider;
import com.auth0.jwk.UrlJwkProvider;
import com.auth0.jwt.JWT;
import com.auth0.jwt.algorithms.Algorithm;
import com.auth0.jwt.interfaces.DecodedJWT;
import lombok.extern.slf4j.Slf4j;

import java.net.URL;
import java.security.PublicKey;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;


@Slf4j
public class ClerkValidator implements TokenValidator {

    /**
     * Seconds of tolerance for {@code nbf}/{@code exp}/{@code iat}. Clerk and the JVM can disagree slightly;
     * without leeway Auth0 rejects with "can't be used before …" relative to nbf/exp/iat.
     */
    private static final int VERIFY_LEEWAY_SECONDS = 120;

    private final JwkProvider jwkProvider;

    public ClerkValidator(String clerkJwksUrl) {
        if (clerkJwksUrl == null || clerkJwksUrl.isBlank()) {
            throw new IllegalStateException(
                    "CLERK_JWKS_URL / clerk.jwks.url is not set. Add it to backend .env (or your run configuration): "
                            + "Clerk Dashboard → configure → API Keys → copy the JWKS URL "
                            + "(format: https://<your-instance>.clerk.accounts.dev/.well-known/jwks.json). "
                            + "In IntelliJ, set Working directory to the backend module folder so .env is loaded.");
        }
        try {
            this.jwkProvider = new UrlJwkProvider(new URL(clerkJwksUrl.trim()));
        } catch (Exception e) {
            log.error("Failed to initialize JwkProvider with URL: {}", clerkJwksUrl, e);
            throw new RuntimeException("Failed to initialize Clerk validator", e);
        }
    }

    @Override
    public boolean validateToken(String token){
        try {
            // Step 1: Decode JWT without verification to get header info
            DecodedJWT decodedJWT = decodeToken(token);
            if (decodedJWT == null) {
                log.error("Failed to decode token");
                return false;
            }

            // Step 2: Extract key ID (kid) from the token header
            String kid = decodedJWT.getKeyId();
            if (kid == null || kid.isEmpty()) {
                log.error("Token does not contain a key ID (kid)");
                return false;
            }

            log.debug("Token kid: {}", kid);

            // Step 3: Fetch JWK and verify signature
            if (!verifyTokenSignature(token, kid)) {
                log.error("Token signature verification failed");
                return false;
            }

            log.debug("Token validation successful for subject: {}", decodedJWT.getSubject());
            return true;

        } catch (Exception e) {
            log.error("Error validating token: {}", e.getMessage());
            return false;
        }
    }

    @Override
    public String extractUserId(String token) {
        try {
            if (!validateToken(token)) {
                return null;
            }
            DecodedJWT decodedJWT = decodeToken(token);
            return decodedJWT != null ? decodedJWT.getSubject() : null;
        } catch (Exception e) {
            log.error("Error extracting user ID: {}", e.getMessage());
            return null;
        }
    }

    @Override
    public List<String> extractRoles(String token) {
        try {
            if (!validateToken(token)) {
                return null;
            }
            DecodedJWT decodedJWT = decodeToken(token);
            if (decodedJWT == null) {
                return null;
            }
            Set<String> roles = new LinkedHashSet<>();
            try {
                List<String> rolesClaim = decodedJWT.getClaim("roles").asList(String.class);
                if (rolesClaim != null) {
                    rolesClaim.stream().filter(r -> r != null && !r.isBlank()).map(String::trim).forEach(roles::add);
                }
            } catch (Exception ignored) {
                // optional claim
            }
            try {
                String singleRole = decodedJWT.getClaim("role").asString();
                if (singleRole != null && !singleRole.isBlank()) {
                    roles.add(singleRole.trim());
                }
            } catch (Exception ignored) {
                // optional claim
            }
            try {
                Map<String, Object> publicMeta = decodedJWT.getClaim("public_metadata").asMap();
                if (publicMeta != null) {
                    Object r = publicMeta.get("role");
                    if (r instanceof String s && !s.isBlank()) {
                        roles.add(s.trim());
                    }
                }
            } catch (Exception ignored) {
                // optional claim — add JWT template in Clerk with public_metadata if missing
            }
            return roles.isEmpty() ? null : new ArrayList<>(roles);
        } catch (Exception e) {
            log.error("Error extracting roles: {}", e.getMessage());
            return null;
        }
    }

    @Override
    public String extractFirstName(String token) {
        try {
            DecodedJWT decodedJWT = decodeToken(token);
            return decodedJWT != null ? decodedJWT.getClaim("first_name").asString() : null;
        } catch (Exception e) {
            log.error("Error extracting first name: {}", e.getMessage());
            return null;
        }
    }

    @Override
    public String extractLastName(String token) {
        try {
            DecodedJWT decodedJWT = decodeToken(token);
            return decodedJWT != null ? decodedJWT.getClaim("last_name").asString() : null;
        } catch (Exception e) {
            log.error("Error extracting last name: {}", e.getMessage());
            return null;
        }
    }

    @Override
    public String extractEmail(String token) {
        try {
            DecodedJWT decodedJWT = decodeToken(token);
            return decodedJWT != null ? decodedJWT.getClaim("email").asString() : null;
        } catch (Exception e) {
            log.error("Error extracting email: {}", e.getMessage());
            return null;
        }
    }


    private DecodedJWT decodeToken(String token) {
        try {
            return JWT.decode(token);
        } catch (Exception e) {
            log.error("Failed to decode token: {}", e.getMessage());
            return null;
        }
    }

    private boolean verifyTokenSignature(String token, String kid) {
        try {
            // Fetch the JWK from Clerk
            Jwk jwk = jwkProvider.get(kid);

            // Get the public key from the JWK
            PublicKey publicKey = jwk.getPublicKey();

            // Create algorithm and verify the token (leeway avoids 401 when local clock lags Clerk)
            Algorithm algorithm = Algorithm.RSA256((java.security.interfaces.RSAPublicKey) publicKey, null);
            JWT.require(algorithm)
                    .acceptLeeway(VERIFY_LEEWAY_SECONDS)
                    .build()
                    .verify(token);

            log.debug("Token signature verified successfully for kid: {}", kid);
            return true;

        } catch (Exception e) {
            log.error("Signature verification failed for kid {}: {}", kid, e.getMessage());
            return false;
        }
    }

}
