package com.stemlink.skillmentor;

import io.github.cdimascio.dotenv.Dotenv;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import java.nio.file.Files;
import java.nio.file.Path;

@SpringBootApplication
public class SkillmentorApplication {

	public static void main(String[] args) {
		loadLocalEnvFile();
		SpringApplication.run(SkillmentorApplication.class, args);
	}

	/**
	 * Loads {@code .env} from the working directory or {@code backend/.env} when the app
	 * is run from the repo root. Does not override real environment variables.
	 */
	private static void loadLocalEnvFile() {
		Path[] candidates = new Path[] {
				Path.of(".env"),
				Path.of("backend", ".env"),
		};
		for (Path p : candidates) {
			if (!Files.isRegularFile(p)) {
				continue;
			}
			Dotenv dotenv = Dotenv.configure()
					.directory(p.getParent().toString())
					.filename(p.getFileName().toString())
					.ignoreIfMalformed()
					.load();
			dotenv.entries().forEach(e -> {
				String key = e.getKey();
				if (System.getenv(key) == null && System.getProperty(key) == null) {
					System.setProperty(key, e.getValue());
				}
			});
			break;
		}
	}
}
