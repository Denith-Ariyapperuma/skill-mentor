package com.stemlink.skillmentor;

import java.net.URI;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import io.github.cdimascio.dotenv.Dotenv;

@SpringBootApplication
public class SkillmentorApplication {

	public static void main(String[] args) {
		loadDotenvFromProject();
		SpringApplication.run(SkillmentorApplication.class, args);
	}

	/**
	 * Loads {@code .env} from the backend module directory so variables are available even when
	 * the JVM working directory is the repo root or another folder (common with IntelliJ defaults).
	 * Does not override existing OS environment variables or system properties.
	 */
	private static void loadDotenvFromProject() {
		try {
			Path dir = resolveEnvDirectory();
			if (dir == null || !Files.isRegularFile(dir.resolve(".env"))) {
				return;
			}
			Dotenv dotenv = Dotenv.configure()
					.directory(dir.toString())
					.ignoreIfMissing()
					.load();
			dotenv.entries().forEach(entry -> {
				String key = entry.getKey();
				if (key == null || key.isBlank()) {
					return;
				}
				if (System.getenv(key) != null) {
					return;
				}
				if (System.getProperty(key) != null) {
					return;
				}
				String value = entry.getValue();
				if (value != null) {
					System.setProperty(key, value);
				}
			});
		} catch (Exception ignored) {
			// Rely on OS env / working-directory dotenv if resolution fails
		}
	}

	private static Path resolveEnvDirectory() throws Exception {
		Path fromCode = moduleRootFromCodeSource();
		if (fromCode != null && Files.isRegularFile(fromCode.resolve(".env"))) {
			return fromCode;
		}
		Path fromWalk = findAncestorWithEnv(Paths.get("").toAbsolutePath());
		if (fromWalk != null) {
			return fromWalk;
		}
		return fromCode;
	}

	private static Path moduleRootFromCodeSource() throws Exception {
		URI codeUri = SkillmentorApplication.class.getProtectionDomain().getCodeSource().getLocation().toURI();
		Path codePath = Paths.get(codeUri);
		if (!Files.isDirectory(codePath)) {
			Path parent = codePath.getParent();
			return parent != null ? parent : null;
		}
		Path leaf = codePath.getFileName();
		if (leaf != null && "classes".equalsIgnoreCase(leaf.toString())) {
			Path target = codePath.getParent();
			if (target != null && "target".equalsIgnoreCase(target.getFileName().toString())) {
				return target.getParent();
			}
		}
		return codePath;
	}

	private static Path findAncestorWithEnv(Path start) {
		Path p = start;
		for (int i = 0; i < 8 && p != null; i++) {
			if (Files.isRegularFile(p.resolve(".env"))) {
				return p;
			}
			p = p.getParent();
		}
		return null;
	}
}
