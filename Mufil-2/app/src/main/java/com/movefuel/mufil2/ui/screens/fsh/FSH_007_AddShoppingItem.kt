package com.movefuel.mufil2.ui.screens.fsh

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun FSH007AddShoppingItemScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "FSH_007",
        title = "Add Shopping Item",
        subtitle = "Shopping and pantry workflow.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.FSH_008,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.FSH_006,
        onNavigate = onNavigate,
    ) {
            MFField("Item name","")
            MFField("Quantity","1")
            MFField("Category","Grocery")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun FSH007AddShoppingItemScreenPreview() {
    MoveFuelTheme { FSH007AddShoppingItemScreen {} }
}
