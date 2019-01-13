require 'google/apis/sheets_v4'
require './authorize.rb'

@service = Google::Apis::SheetsV4::SheetsService.new
@service.client_options.application_name = APPLICATION_NAME
@service.authorization = authorize

def get_values(spreadsheet_id,range)
  response = @service.get_spreadsheet_values(spreadsheet_id, range)
  if response.values.empty?
    puts 'No data found.' 
  end
  response
end


# Print data
spreadsheet_id = '1hqFgqqKbNZwBvB63IzwnbkaKApF4jblnvjTjpxIXu40'

@lib_cols = []
get_values(spreadsheet_id,'libraries!A1:Z1').values.each do |row|
  row.each do |col|
    @lib_cols << col
  end
end

@libraries = []
get_values(spreadsheet_id,'libraries!A2:Z').values.each do |row|
  lib = {}
  for index in 0...@lib_cols.length
    lib[@lib_cols[index].to_sym] = row[index]
  end

  @libraries << lib
end

puts @libraries