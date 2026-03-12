package com.stemlink.skillmentor.security;

import jakarta.annotation.Nonnull;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
public class AuthenticationFilter extends OncePerRequestFilter {
    private final TokenValidator tokenValidator;

    @Override
    protected void doFilterInternal(@Nonnull HttpServletRequest request, @Nonnull HttpServletResponse response, @Nonnull FilterChain filterChain)
            throws ServletException, IOException {

        String token = extractToken(request);

        if (token != null && tokenValidator.validateToken(token)) {
            String userId = tokenValidator.extractUserId(token);
//            List<String> roles = new ArrayList<>();

            // extract user id, first name, last name, email from token
            String email = tokenValidator.extractEmail(token);
            String firstName = tokenValidator.extractFirstName(token);
            String lastName = tokenValidator.extractLastName(token);

            UserPrincipal userPrincipal = new UserPrincipal(userId,email,firstName,lastName);
            //UserPrincipal userPrincipal = UserPrincipal.builder().id(userId)...


            // Extract roles from the token
            List<String> roles = tokenValidator.extractRoles(token);
            List<GrantedAuthority> authorities = roles != null ?
                    roles.stream()
                            .map(role -> new SimpleGrantedAuthority("ROLE_" + role))
                            .collect(Collectors.toList()) :
                    new ArrayList<>();

            UsernamePasswordAuthenticationToken authentication =
                    new UsernamePasswordAuthenticationToken(userPrincipal, null, authorities);
            SecurityContextHolder.getContext().setAuthentication(authentication);
        }

        filterChain.doFilter(request, response);
    }

    private String extractToken(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        if (bearerToken != null && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }
        return null;
    }
}
