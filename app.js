const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const _ = require("lodash");

const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

mongoose.connect("mongodb://127.0.0.1:27017/todolistDB", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const itemsSchema = {
  name: String
};

const Item = mongoose.model("Item", itemsSchema);

const item1 = new Item({
  name: "Welcome to your to do list.",
});

const item2 = new Item({
  name: "Start adding the items, it feels so empty.",
});

const item3 = new Item({
  name: "<-- press this to to add a new item.",
});

const defaultItems = [item1, item2, item3];

const listSchema = {
  name: String,
  items: [itemsSchema],
};

const List = mongoose.model("List", listSchema);


app.get("/", async function(req, res) {
  try {
    // Find and display the items
    const foundItems = await Item.find();
    // console.log("Found Items:", foundItems);
    if (foundItems.length === 0) {
      Item.insertMany(defaultItems);
      res.redirect("/");
    } else {
      res.render("list", { listTitle: "Today", newListItems: foundItems });
    }    
  } catch (error) {
    console.error("Error finding items:", error);
    res.status(500).send("Internal Server Error");
  }
});


app.get("/:customListName", async function(req, res) {
  const customListName = _.capitalize(req.params.customListName);

  try {
    const existingList = await List.findOne({ name: customListName });

    if (!existingList) {
      const list = new List({
        name: customListName,
        items: defaultItems,
      });

      await list.save();
      return res.redirect("/" + customListName);
    }

    return res.render("list", { listTitle: existingList.name, newListItems: existingList.items });
  } catch (error) {
    console.error("Error creating or rendering list " + customListName, error);
    res.status(500).send("Internal Server Error");
  }
});


app.post("/", async function(req, res) {
  const itemName = req.body.newItem;
  const listName = req.body.list;

  if (itemName.trim() !== "") {
    const item = new Item({
      name: itemName,
    });

    if (listName == "Today") {
      item.save();
      res.redirect("/");
    } else {
      try {
        const foundList = await List.findOne({ name: listName });

        if (foundList) {
          foundList.items.push(item);
          await foundList.save();
          res.redirect("/" + listName);
        } else {
          console.error("List not found:", listName);
          res.status(404).send("List not found");
        }
      } catch (error) {
        console.error("Error finding or updating list:", error);
        res.status(500).send("Internal Server Error");
      }
    }
  } else {
    res.redirect("/");
  }
});


// app.post("/delete", function(req, res){
//   const checkedItemId = req.body.checkbox;
//   Item.findByIdAndDelete(checkedItemId);
//   res.redirect("/");
// });

app.post("/delete", async function(req, res) {
  const checkedItemId = req.body.checkbox;
  const listName = req.body.listName;

  try {
    if (listName === "Today") {
      // Delete item for "Today" list
      await Item.findByIdAndDelete(checkedItemId);
      console.log(`Item ${checkedItemId} deleted successfully.`);
      res.redirect("/");
    } else {
      // Delete item from custom list
      const result = await List.findOneAndUpdate(
        { name: listName },
        { $pull: { items: { _id: checkedItemId } } },
        { new: true } // Return the updated document
      );

      if (result) {
        console.log(`Item with _id ${checkedItemId} removed from list "${listName}"`);
        res.redirect("/" + listName);
      } else {
        console.log(`List "${listName}" not found`);
        res.status(404).send("List not found");
      }
    }
  } catch (error) {
    console.error('Error removing item:', error);
    res.status(500).send("Internal Server Error");
  }
});


app.get("/work", function(req,res){
  res.render("list", {listTitle: "Work List", newListItems: workItems});
});

app.get("/about", function(req, res){
  res.render("about");
});

app.listen(3000, function() {
  console.log("Server started on port 3000");
});
