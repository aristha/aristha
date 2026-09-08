#!/usr/bin/env ruby
# frozen_string_literal: true

require "yaml"
require "json"

input = ARGV[0] || "story/journey.yml"
output = ARGV[1] || "site/story.json"

data = YAML.safe_load(
  File.read(input, encoding: "UTF-8"),
  permitted_classes: [],
  permitted_symbols: [],
  aliases: false
)

File.write(output, JSON.pretty_generate(data) + "\n", mode: "w", encoding: "UTF-8")
puts "Generated #{output} from #{input}"
