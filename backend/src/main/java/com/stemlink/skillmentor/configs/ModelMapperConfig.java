package com.stemlink.skillmentor.configs;

import com.stemlink.skillmentor.dto.MentorDTO;
import com.stemlink.skillmentor.entities.Mentor;
import org.modelmapper.ModelMapper;
import org.modelmapper.convention.MatchingStrategies;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class ModelMapperConfig {

    @Bean
    public ModelMapper modelMapper() {
        ModelMapper modelMapper = new ModelMapper();
        modelMapper.getConfiguration().setSkipNullEnabled(true);
        modelMapper.getConfiguration().setMatchingStrategy(MatchingStrategies.STRICT);
        modelMapper.createTypeMap(Mentor.class, MentorDTO.class).addMappings(m -> m.skip(MentorDTO::setSubjects));
        modelMapper.createTypeMap(MentorDTO.class, Mentor.class).addMappings(m -> {
            m.skip(Mentor::setSubjects);
            m.skip(Mentor::setSessions);
        });
        return modelMapper;
    }
}
