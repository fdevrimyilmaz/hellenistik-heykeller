import { AppRegistry, Platform } from "react-native";
import * as AppModule from "./App";

const App = AppModule.default || AppModule;
AppRegistry.registerComponent("main", () => App);

if (Platform.OS === "web") {
  AppRegistry.runApplication("main", {
    rootTag: document.getElementById("root"),
  });
}
