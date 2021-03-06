﻿$data.Class.define("ExampleSite", null, null, {
    constructor: function () {
        this.Example = $data.define("Example", {
            Title: String,
            Lead: String,
            Description: String,
            Image: String,
            Link: String,
            Tags: String,
            Suggested: String,
            Level: Number,
            ComputedLevel: Number,
            TagList: Object,
            LimitedTagList: Object
        });
        this.Example.setStore('default', {
            provider: 'webApi',
            dataSource: '/examples/api/Examples'
        });
        this.Example.setStore('local', {
            provider: 'LocalStore',
            collectionName: 'Example_items'
        });
        this.Model = {
            addHistory: false,
            qStr: ko.observable("")
        };
    },
    initialize: function () {
        var self = this;
        this.Model.ExampleData = new ko.observableArray([]);
        this.Model.VisibleData = ko.computed(function () {
            var d = new ko.observableArray([]);
            var subItems = null;
            var items = self.Model.ExampleData();
            for (var i = 0; i < items.length; i++) {
                if (subItems == null || subItems != null && subItems().length > 2) {
                    subItems = new ko.observableArray([]);
                    d.push(subItems);
                }
                subItems.push(items[i]);
            }

            return d;
        });
        this.Model.SelectedTags = ko.observableArray([]);
        this.Model.removeTags = function () {
            self.Model.SelectedTags([]);
            self.filter();
        }
        this.Model.removeTag = function (tag) {
            var idx = self.Model.SelectedTags().indexOf(tag);
            if (idx >= 0) {
                var data = self.Model.SelectedTags();
                data.splice(idx, 1);
                self.Model.SelectedTags(data);
                self.filter();
            }
        }
        this.Model.addTags = function (tag, clear) {
            var tags = tag;
            var addNewTag = false;
            if (!(tag instanceof Array)) {
                tags = [tag];
            }
            if (clear === true) {
                self.Model.SelectedTags.removeAll();
            }
            tags.forEach(function (item) {
                if (self.Model.SelectedTags().indexOf(item) < 0) {
                    self.Model.SelectedTags.push(item);
                    addNewTag = true;
                }
            }, this);
            if (addNewTag) {
                self.filter();
            }
        }
        this.Model.addLogoFilter = function (tag) {
            self.Model.removeTags();
            self.Model.addTags(tag);
            toggleLogoFilter();
        }
        this.Model.isActiveTag = function (tag) {
            return self.Model.SelectedTags().indexOf(tag) >= 0;
        }
        return this.getExamplesFromServer();
    },
    getExamplesFromServer: function () {
        var self = this;
        return this.Example.removeAll("local").then(function () {
            self.Example.readAll().then(function (items) {
                var promises = [];
                for (var i = 0; i < items.length; i++) {
                    promises.push(items[i].save("local"));
                }
                $.when.apply($, promises).done(self.filter);
            });
        });
    },
    filter: function () {
        var self = exampleSite;
        var qStr = "";
        var q = self.Model.qStr();
        var urlParam = '/examples/';
        if (q != null && q != undefined && q != "") {
            q = q.toLowerCase();
            qStr = "(it.Title.toLowerCase().contains('" + q + "')==true || it.Lead.toLowerCase().contains('" + q + "')==true)";
            urlParam += "?q=" + q;
        }

        if (self.Model.SelectedTags().length > 0) {
            if (urlParam && urlParam.length > 10) {
                urlParam += "&";
            } else {
                urlParam += "?";
            }
            urlParam += "tags=" + self.Model.SelectedTags().join(',');


            if (qStr) {
                qStr += " && ";
            }
            qStr += "(";
            for (var i = 0; i < self.Model.SelectedTags().length; i++) {
                if (i > 0) { qStr += " && "; }
                qStr += "(it.Tags.contains('" + self.Model.SelectedTags()[i] + "'))";
            }
            qStr += ")";
        }

        if (urlParam && urlParam.length > 10 && window.isBackButton !== true) {
            //console.log("url param: ", urlParam, ' window.history length: ', window.history.length);
            if (self.Model.addHistory) {
                window.history.pushState(null, "filter", urlParam);
            } else {
                self.Model.addHistory = true;
                window.history.pushState(null, "filter", urlParam);
            }
        }
        //console.log("q: ", qStr);

        var query = null;
        if (qStr != "") {
            query = self.Example.query(qStr, null, "local");
        } else {
            query = self.Example.readAll("local");
        }

        return query.then(function (items) {
            items.sort(function (a, b) { return a.ComputedLevel - b.ComputedLevel; });
            var data = [];
            for (var i = 0; i < items.length; i++) {
                data.push(items[i].asKoObservable());
            }
            self.Model.ExampleData(data);
        })
        .fail(function () {
            console.log(arguments);
        });
    },
    searchInput_onkeyup: function () {
        var self = this;
        clearTimeout(this.typingTimer);
        this.typingTimer = setTimeout(function () {
            self.Model.qStr($('#q').val());
            self.filter();
        }, 500);
    },
    searchInput_onkeydown: function () {
        clearTimeout(this.typingTimer);
    }
});