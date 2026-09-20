package com.movefuel.mufil2.ui.screens.fsh

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun FSH013RecipeIngredientsScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "FSH_013",
        title = "Recipe Ingredients",
        subtitle = "Shopping and pantry workflow.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.FSH_014,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.FSH_012,
        onNavigate = onNavigate,
    ) {
            MFListItem("Chicken breast","Required by 2 meals","2 packs")
            MFListItem("Rice","Required by 3 meals","1 bag")
            MFListItem("Vegetables","Required by recipes","5 items")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun FSH013RecipeIngredientsScreenPreview() {
    MoveFuelTheme { FSH013RecipeIngredientsScreen {} }
}
