package com.stemlink.skillmentor.controllers;


import com.stemlink.skillmentor.dto.SessionDTO;
import com.stemlink.skillmentor.entities.Session;
import com.stemlink.skillmentor.services.SessionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping(path = "/api/v1/sessions")
@RequiredArgsConstructor
@Validated
@PreAuthorize("isAuthenticated()")
public class SessionController extends AbstractController{

    private final SessionService sessionService;

    @GetMapping
    public List<Session> getAllSessions() {
        return sessionService.getAllSessions();
    }

    @GetMapping("{id}")
    public Session getSessionById(@PathVariable Long id) {
        return sessionService.getSessionById(id);
    }

    @PostMapping
    public Session createSession(@Valid @RequestBody SessionDTO sessionDTO) {
        return sessionService.createNewSession(sessionDTO);
    }

    @PutMapping("{id}")
    public Session updateSession(@PathVariable Long id, @Valid @RequestBody SessionDTO updatedSessionDTO) {
        return sessionService.updateSessionById(id, updatedSessionDTO);
    }

    @DeleteMapping("{id}")
    public void deleteSession(@PathVariable Long id) {
        sessionService.deleteSession(id);
    }
}