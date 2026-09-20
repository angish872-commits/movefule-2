package com.movefuel.mufil2.ui.screens.fsh

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun FSH004EditShoppingItemScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "FSH_004",
        title = "Edit Shopping Item",
        subtitle = "Shopping and pantry workflow.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.FSH_005,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.FSH_003,
        onNavigate = onNavigate,
    ) {
            MFField("Item","Chicken breast")
            MFField("Quantity","2 packs")
            MFField("Note","Choose any fresh pack")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun FSH004EditShoppingItemScreenPreview() {
    MoveFuelTheme { FSH004EditShoppingItemScreen {} }
}
