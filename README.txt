BLACKSPIRE WEBSITE v7

RUN (needs Node.js 18+):
  1. npm install        (first time only)
  2. npm start
  3. open http://localhost:3000

"Build with us" / contact form enquiries are saved as new rows in:
  data/enquiries.xlsx   (created automatically on the first enquiry)
Columns: Submitted at, Name, Email, Topic, Venture (if any), Message.
Close the Excel file before a new enquiry arrives, or saving will fail until it is closed.

Opening the HTML files directly (double-click) or using plain static hosting still shows the site,
but the contact form needs "npm start" to save data.
