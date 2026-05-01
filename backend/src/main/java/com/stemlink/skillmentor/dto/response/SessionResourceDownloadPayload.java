package com.stemlink.skillmentor.dto.response;

public record SessionResourceDownloadPayload(byte[] bytes, String filename, String contentType) {
}
