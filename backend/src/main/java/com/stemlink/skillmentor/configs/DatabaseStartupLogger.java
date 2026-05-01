package com.stemlink.skillmentor.configs;

import java.sql.Connection;
import java.sql.SQLException;

import javax.sql.DataSource;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

@Component
public class DatabaseStartupLogger {

	private static final Logger log = LoggerFactory.getLogger(DatabaseStartupLogger.class);

	@EventListener(ApplicationReadyEvent.class)
	public void onApplicationReady(ApplicationReadyEvent event) {
		DataSource dataSource = event.getApplicationContext().getBean(DataSource.class);
		try (Connection connection = dataSource.getConnection()) {
			if (connection.isValid(5)) {
				String url = connection.getMetaData().getURL();
				String catalog = connection.getCatalog();
				log.info("Database connected successfully (catalog={}, url={})", catalog, url);
			} else {
				log.warn("Database connection acquired but validation timed out or failed");
			}
		} catch (SQLException e) {
			log.error("Database connection check failed after startup", e);
		}
	}
}
